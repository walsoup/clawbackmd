import { SEED_CLAIMS, SEED_NOTES, SEED_POLICIES } from "@/data/seed";
import { CACHED_APPEALS } from "@/data/cached-appeals";

export type PolicyRow = {
  id: string;
  payer: string;
  policy_code: string;
  title: string;
  body: string;
};

export type ClaimRow = {
  id: string;
  patient_alias: string;
  cpt_codes: string[];
  billed_amount: number;
  payer_name: string;
  carc_code: string;
  rarc_code: string | null;
  denial_reason: string;
  denied_at: string;
  status: string;
  policy_id: string;
};

export type NoteRow = {
  id: string;
  claim_id: string;
  note_type: string;
  authored_at: string;
  text: string;
};

export type AppealRow = {
  id: string;
  claim_id: string;
  analysis: Record<string, unknown>;
  letter: Record<string, unknown>;
  p2p: Record<string, unknown>;
  model: string;
  latency_ms: number;
  created_at: string;
  is_cached: boolean;
  is_active: boolean;
};

export type SeedRows = {
  policies: PolicyRow[];
  claims: ClaimRow[];
  notes: NoteRow[];
  appeals: AppealRow[];
};

/**
 * Single builder used by both SQL generator and POST /api/seed.
 * Cached appeals are inserted inactive so KPIs start at $0.
 */
export function buildSeedRows(): SeedRows {
  const policies: PolicyRow[] = SEED_POLICIES.map((p) => ({ ...p }));

  const claims: ClaimRow[] = SEED_CLAIMS.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ expected_verdict: _expected, ...rest }) => ({ ...rest }),
  );

  const notes: NoteRow[] = SEED_NOTES.map((n) => ({ ...n }));

  const appeals: AppealRow[] = CACHED_APPEALS.map((a) => ({
    id: a.id,
    claim_id: a.claim_id,
    analysis: a.analysis as unknown as Record<string, unknown>,
    letter: a.analysis.letter as unknown as Record<string, unknown>,
    p2p: a.analysis.p2p as unknown as Record<string, unknown>,
    model: a.model,
    latency_ms: a.latency_ms,
    created_at: a.created_at,
    is_cached: true,
    is_active: false,
  }));

  return { policies, claims, notes, appeals };
}
