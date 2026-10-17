/**
 * Single OpenAI-compatible /chat/completions adapter.
 * No provider-specific branches.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatJSONResult = {
  data: unknown;
  raw: string;
  latency_ms: number;
  model: string;
};

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v !== undefined && v !== "") return v;
  if (fallback !== undefined) return fallback;
  throw new LLMError(`Missing required env ${name}`);
}

export async function chatJSON(
  messages: ChatMessage[],
  opts: { timeoutMs?: number } = {},
): Promise<ChatJSONResult> {
  const baseUrl = env("LLM_BASE_URL", "http://localhost:11434/v1").replace(
    /\/$/,
    "",
  );
  const model = env("LLM_MODEL", "gemma3");
  const apiKey = process.env.LLM_API_KEY;
  const timeoutMs = opts.timeoutMs ?? 120_000;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LLMError(
        `LLM HTTP ${res.status}: ${body.slice(0, 400)}`,
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      throw new LLMError("LLM returned empty content");
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // Some models wrap JSON in markdown fences
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced?.[1]) {
        data = JSON.parse(fenced[1]);
      } else {
        throw new LLMError(`Failed to parse JSON from model: ${String(e)}`, e);
      }
    }

    return {
      data,
      raw,
      latency_ms: Math.round(performance.now() - started),
      model: json.model ?? model,
    };
  } catch (e) {
    if (e instanceof LLMError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new LLMError(`LLM timed out after ${timeoutMs}ms`, e);
    }
    throw new LLMError(
      `LLM request failed: ${e instanceof Error ? e.message : String(e)}`,
      e,
    );
  } finally {
    clearTimeout(timer);
  }
}
