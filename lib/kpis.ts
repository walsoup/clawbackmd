import { kpiSource } from "./data";
import { useMemoryStore } from "./db";
import { computePrivacyStatus } from "./privacy";

export type KpiPayload = {
  totalDeniedCount: number;
  totalDeniedAmount: number;
  appealReadyAmount: number;
  avgLatencyMs: number | null;
  avgLatencyLabel: string;
  privacy: ReturnType<typeof computePrivacyStatus>;
};

export async function computeKpis(): Promise<KpiPayload> {
  const { claims, live, cached } = await kpiSource();

  const totalDeniedCount = claims.length;
  const totalDeniedAmount = claims.reduce(
    (s, c) => s + Number(c.billed_amount),
    0,
  );
  const appealReadyAmount = claims
    .filter((c) => c.status === "appeal_ready")
    .reduce((s, c) => s + Number(c.billed_amount), 0);

  let avgLatencyMs: number | null = null;
  let avgLatencyLabel = "n/a";

  if (live.length > 0) {
    avgLatencyMs = Math.round(
      live.reduce((s, a) => s + a.latency_ms, 0) / live.length,
    );
    avgLatencyLabel = formatMs(avgLatencyMs);
  } else if (cached.length > 0) {
    avgLatencyMs = Math.round(
      cached.reduce((s, a) => s + a.latency_ms, 0) / cached.length,
    );
    avgLatencyLabel = `${formatMs(avgLatencyMs)} (cached sample)`;
  }

  // Memory store counts as local DB (no network).
  const dbUrl = useMemoryStore()
    ? "http://127.0.0.1:0"
    : (process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      "http://127.0.0.1:54321");

  const privacy = computePrivacyStatus(
    process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
    dbUrl,
  );

  return {
    totalDeniedCount,
    totalDeniedAmount,
    appealReadyAmount,
    avgLatencyMs,
    avgLatencyLabel,
    privacy,
  };
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const min = sec / 60;
  return `${min.toFixed(1)} min`;
}
