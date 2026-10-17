/**
 * In-memory demo store used when Supabase is unavailable
 * (e.g. no Docker for `supabase start`). Same shape as Postgres tables.
 * Enable with USE_MEMORY_STORE=true or by leaving SUPABASE_SERVICE_ROLE_KEY empty.
 */
import { buildSeedRows, type AppealRow, type ClaimRow, type NoteRow, type PolicyRow } from "./seed-rows";

type Store = {
  policies: PolicyRow[];
  claims: ClaimRow[];
  notes: NoteRow[];
  appeals: AppealRow[];
};

const g = globalThis as unknown as { __clawbackStore?: Store };

function store(): Store {
  if (!g.__clawbackStore) {
    const rows = buildSeedRows();
    g.__clawbackStore = {
      policies: rows.policies,
      claims: rows.claims.map((c) => ({ ...c })),
      notes: rows.notes,
      appeals: rows.appeals.map((a) => ({ ...a })),
    };
  }
  return g.__clawbackStore;
}

export function memoryResetFromSeed() {
  const rows = buildSeedRows();
  g.__clawbackStore = {
    policies: rows.policies,
    claims: rows.claims.map((c) => ({ ...c })),
    notes: rows.notes,
    appeals: rows.appeals.map((a) => ({ ...a })),
  };
  return {
    policies: rows.policies.length,
    claims: rows.claims.length,
    notes: rows.notes.length,
    appeals: rows.appeals.length,
  };
}

export const memoryDb = {
  listPolicies: () => store().policies,
  listClaims: () => store().claims,
  listNotes: () => store().notes,
  listAppeals: () => store().appeals,
  getClaim: (id: string) => store().claims.find((c) => c.id === id) ?? null,
  getPolicy: (id: string) => store().policies.find((p) => p.id === id) ?? null,
  notesForClaim: (claimId: string) =>
    store().notes.filter((n) => n.claim_id === claimId),
  activeAppeal: (claimId: string) =>
    store().appeals.find((a) => a.claim_id === claimId && a.is_active) ?? null,
  cachedAppeal: (claimId: string) =>
    store()
      .appeals.filter((a) => a.claim_id === claimId && a.is_cached)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
  deactivateAppeals: (claimId: string) => {
    for (const a of store().appeals) {
      if (a.claim_id === claimId) a.is_active = false;
    }
  },
  insertAppeal: (row: AppealRow) => {
    store().appeals.push(row);
  },
  activateAppeal: (
    id: string,
    patch?: { analysis?: Record<string, unknown>; letter?: Record<string, unknown>; p2p?: Record<string, unknown> },
  ) => {
    const a = store().appeals.find((x) => x.id === id);
    if (a) {
      a.is_active = true;
      if (patch?.analysis) a.analysis = patch.analysis;
      if (patch?.letter) a.letter = patch.letter;
      if (patch?.p2p) a.p2p = patch.p2p;
    }
  },
  updateClaimStatus: (id: string, status: string) => {
    const c = store().claims.find((x) => x.id === id);
    if (c) c.status = status;
  },
};
