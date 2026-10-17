import { chatJSON, LLMError, type ChatMessage } from "./llm";
import { AnalysisSchema, type ValidatedAnalysis } from "./schemas";
import {
  buildPrompt,
  buildRetryMessages,
  type ClaimContext,
} from "./prompt";
import {
  validateAnalysis,
  type NoteSource,
  type PolicySource,
} from "./validate";

export type AnalysisContext = {
  claim: ClaimContext;
  policy: PolicySource;
  notes: NoteSource[];
  /** Policy codes allowed in citations (typically all DB codes). */
  allowedPolicyCodes: string[];
  /** Extra citation allowlist (e.g. simulator pasted policy code). */
  extraCitationAllow?: string[];
};

export type PipelineResult = {
  analysis: ValidatedAnalysis;
  model: string;
  latency_ms: number;
  retried: boolean;
  droppedEvidence: string[];
  droppedCitations: string[];
};

function parseAnalysis(data: unknown) {
  return AnalysisSchema.parse(data);
}

export async function runAnalysis(
  ctx: AnalysisContext,
  opts: { timeoutMs?: number } = {},
): Promise<PipelineResult> {
  const allowedCitations = [
    ...ctx.allowedPolicyCodes,
    ...(ctx.extraCitationAllow ?? []),
  ];

  const baseMessages = buildPrompt({
    claim: ctx.claim,
    policy: ctx.policy,
    notes: ctx.notes,
    allowedCitations,
  });

  const t0 = performance.now();
  let messages: ChatMessage[] = baseMessages;
  let retried = false;
  let lastRaw = "";
  let model = process.env.LLM_MODEL ?? "gemma3";
  let llmLatency = 0;

  // Attempt 1
  let result = await chatJSON(messages, opts);
  lastRaw = result.raw;
  model = result.model;
  llmLatency += result.latency_ms;

  let parsed;
  let validation;
  try {
    parsed = parseAnalysis(result.data);
    validation = validateAnalysis(
      parsed,
      ctx.notes,
      ctx.policy,
      ctx.allowedPolicyCodes,
      ctx.extraCitationAllow,
    );
  } catch (e) {
    // Zod failure → retry
    retried = true;
    messages = buildRetryMessages(baseMessages, lastRaw, [
      `JSON schema validation failed: ${e instanceof Error ? e.message : String(e)}`,
    ]);
    result = await chatJSON(messages, opts);
    lastRaw = result.raw;
    model = result.model;
    llmLatency += result.latency_ms;
    parsed = parseAnalysis(result.data);
    validation = validateAnalysis(
      parsed,
      ctx.notes,
      ctx.policy,
      ctx.allowedPolicyCodes,
      ctx.extraCitationAllow,
    );
  }

  // Quote failures → retry once
  if (!retried && validation.needsRetry) {
    retried = true;
    messages = buildRetryMessages(
      baseMessages,
      lastRaw,
      validation.retryHints,
    );
    try {
      result = await chatJSON(messages, opts);
      lastRaw = result.raw;
      model = result.model;
      llmLatency += result.latency_ms;
      parsed = parseAnalysis(result.data);
      validation = validateAnalysis(
        parsed,
        ctx.notes,
        ctx.policy,
        ctx.allowedPolicyCodes,
        ctx.extraCitationAllow,
      );
    } catch (e) {
      // Keep first validation result if retry itself fails parsing
      if (!(e instanceof LLMError)) {
        // zod error — keep prior validation (with drops applied)
      } else {
        throw e;
      }
    }
  }

  // Wall-clock also fine; prefer sum of LLM calls for stored latency
  void t0;

  return {
    analysis: validation.analysis,
    model,
    latency_ms: llmLatency,
    retried,
    droppedEvidence: validation.droppedEvidence,
    droppedCitations: validation.droppedCitations,
  };
}

export { LLMError };
