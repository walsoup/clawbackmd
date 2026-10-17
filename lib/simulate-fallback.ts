/**
 * Offline fallback for custom-denial analysis when the LLM is unavailable.
 * Builds a weak draft with verbatim quotes when possible — never invents evidence.
 */
import type { ValidatedAnalysis } from "./schemas";
import { findVerbatim, validateAnalysis } from "./validate";
import type { Analysis } from "./schemas";

export function buildSimulateFallback(args: {
  denialReason: string;
  policyCode: string;
  policyText: string;
  noteId: string;
  noteText: string;
  noteAt: string;
  allowedPolicyCodes: string[];
}): ValidatedAnalysis {
  const { denialReason, policyCode, policyText, noteId, noteText, noteAt } =
    args;

  // Prefer a mid-length sentence-ish slice from the note for evidence
  const noteQuote =
    pickVerbatimSlice(noteText, 80, 180) ??
    noteText.slice(0, Math.min(120, noteText.length));

  const policyQuote =
    pickVerbatimSlice(policyText, 60, 160) ??
    (findVerbatim("medical necessity", policyText)
      ? "medical necessity"
      : policyText.slice(0, Math.min(100, policyText.length)));

  const raw: Analysis = {
    verdict: "weak",
    confidence: 0.35,
    denial_reason: denialReason,
    policy_clause: {
      policy_code: policyCode,
      quote: policyQuote,
    },
    evidence: noteQuote
      ? [
          {
            quote: noteQuote,
            note_id: noteId,
            timestamp: noteAt,
          },
        ]
      : [],
    gaps: [
      "Live model unavailable — this is an offline draft stub.",
      "Physician and billing must complete review before any appeal is sent.",
      "Re-run with a local LLM for a full analysis.",
    ],
    letter: {
      sections: [
        {
          heading: "Internal note — incomplete analysis",
          body: `A live model was not available. Denial reason on file: ${denialReason}. Chart and policy excerpts below were extracted as verbatim substrings only where possible. Do not send this letter without regenerating with a model and completing review.`,
        },
        {
          heading: "Next step",
          body: "Start Ollama (or another OpenAI-compatible endpoint), then re-run Analyze a custom denial.",
        },
      ],
      citations: [policyCode],
    },
    p2p: {
      opening:
        "Model was offline — treat this as a placeholder cheat sheet only.",
      talking_points: [
        "Confirm the denial reason against the remittance.",
        "Re-run analysis with a local model before peer-to-peer.",
      ],
      likely_pushback: [
        {
          objection: "Why is this incomplete?",
          response:
            "Offline fallback only. We do not invent clinical findings when the model is down.",
        },
      ],
      ask: "Defer peer-to-peer until a full draft is regenerated.",
    },
  };

  const validated = validateAnalysis(
    raw,
    [{ id: noteId, text: noteText, authored_at: noteAt }],
    { policy_code: policyCode, body: policyText },
    args.allowedPolicyCodes,
    {
      extraCitationAllow: [policyCode],
      planType: "unknown",
      claimFacts: {
        id: "SIM-CLAIM",
        denial_reason: denialReason,
        carc_code: "CO-50",
      },
    },
  );
  return validated.analysis;
}

function pickVerbatimSlice(
  text: string,
  minLen: number,
  maxLen: number,
): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < minLen) {
    return cleaned.length > 20 ? cleaned : null;
  }
  // Prefer a span starting at a capital letter
  const start = cleaned.search(/[A-Z]/);
  const from = start >= 0 ? start : 0;
  const slice = cleaned.slice(from, from + maxLen);
  const end = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf(";"),
    slice.lastIndexOf(","),
  );
  const quote = (end > minLen / 2 ? slice.slice(0, end + 1) : slice).trim();
  return findVerbatim(quote, text) ? quote : cleaned.slice(0, maxLen);
}
