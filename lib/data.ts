/**
 * Data access — Supabase when configured, otherwise in-memory demo store.
 */
import { getServiceDb, useMemoryStore, type DbAppeal, type DbClaim, type DbNote, type DbPolicy } from "./db";
import { memoryDb, memoryResetFromSeed } from "./memory-store";
import { buildSeedRows, type AppealRow } from "./seed-rows";
import type { ValidatedAnalysis } from "./schemas";

export type EnrichedClaim = DbClaim & {
  policy: DbPolicy | null;
  notes: DbNote[];
  activeAppeal: {
    id: string;
    model: string;
    latency_ms: number;
    created_at: string;
    is_cached: boolean;
    analysis: ValidatedAnalysis;
    letter: unknown;
    p2p: unknown;
  } | null;
};

export async function seedAll() {
  if (useMemoryStore()) {
    return memoryResetFromSeed();
  }
  const db = getServiceDb();
  const { policies, claims, notes, appeals } = buildSeedRows();
  await db.from("appeals").delete().neq("id", "");
  await db.from("patient_ehr_notes").delete().neq("id", "");
  await db.from("denied_claims").delete().neq("id", "");
  await db.from("payer_policies").delete().neq("id", "");
  const { error: pErr } = await db.from("payer_policies").insert(policies);
  if (pErr) throw pErr;
  const { error: cErr } = await db.from("denied_claims").insert(claims);
  if (cErr) throw cErr;
  const { error: nErr } = await db.from("patient_ehr_notes").insert(notes);
  if (nErr) throw nErr;
  const { error: aErr } = await db.from("appeals").insert(appeals);
  if (aErr) throw aErr;
  return {
    policies: policies.length,
    claims: claims.length,
    notes: notes.length,
    appeals: appeals.length,
  };
}

export async function listEnrichedClaims(): Promise<EnrichedClaim[]> {
  if (useMemoryStore()) {
    const claims = memoryDb.listClaims();
    const policies = memoryDb.listPolicies();
    const notes = memoryDb.listNotes();
    const appeals = memoryDb.listAppeals().filter((a) => a.is_active);
    const policyById = new Map(policies.map((p) => [p.id, p]));
    const notesByClaim = new Map<string, DbNote[]>();
    for (const n of notes) {
      const list = notesByClaim.get(n.claim_id) ?? [];
      list.push(n);
      notesByClaim.set(n.claim_id, list);
    }
    const appealByClaim = new Map(appeals.map((a) => [a.claim_id, a]));
    return claims.map((c) => enrich(c, policyById, notesByClaim, appealByClaim));
  }

  const db = getServiceDb();
  const { data: claims, error } = await db
    .from("denied_claims")
    .select("*")
    .order("denied_at", { ascending: false });
  if (error) throw error;
  const { data: policies } = await db.from("payer_policies").select("*");
  const { data: notes } = await db.from("patient_ehr_notes").select("*");
  const { data: appeals } = await db
    .from("appeals")
    .select("*")
    .eq("is_active", true);

  const policyById = new Map((policies ?? []).map((p) => [p.id, p as DbPolicy]));
  const notesByClaim = new Map<string, DbNote[]>();
  for (const n of notes ?? []) {
    const list = notesByClaim.get(n.claim_id) ?? [];
    list.push(n as DbNote);
    notesByClaim.set(n.claim_id, list);
  }
  const appealByClaim = new Map(
    (appeals ?? []).map((a) => [a.claim_id, a as unknown as AppealRow]),
  );

  return (claims ?? []).map((c) =>
    enrich(c as DbClaim, policyById, notesByClaim, appealByClaim),
  );
}

function enrich(
  c: ClaimLike,
  policyById: Map<string, DbPolicy>,
  notesByClaim: Map<string, DbNote[]>,
  appealByClaim: Map<string, AppealRow>,
): EnrichedClaim {
  const policy = policyById.get(c.policy_id) ?? null;
  const claimNotes = notesByClaim.get(c.id) ?? [];
  const appeal = appealByClaim.get(c.id) ?? null;
  return {
    id: c.id,
    patient_alias: c.patient_alias,
    cpt_codes: c.cpt_codes,
    billed_amount: Number(c.billed_amount),
    payer_name: c.payer_name,
    carc_code: c.carc_code,
    rarc_code: c.rarc_code,
    denial_reason: c.denial_reason,
    denied_at: c.denied_at,
    status: c.status,
    policy_id: c.policy_id,
    policy,
    notes: claimNotes,
    activeAppeal: appeal
      ? {
          id: appeal.id,
          model: appeal.model,
          latency_ms: appeal.latency_ms,
          created_at: appeal.created_at,
          is_cached: appeal.is_cached,
          analysis: appeal.analysis as unknown as ValidatedAnalysis,
          letter: appeal.letter,
          p2p: appeal.p2p,
        }
      : null,
  };
}

type ClaimLike = {
  id: string;
  patient_alias: string;
  cpt_codes: string[];
  billed_amount: number | string;
  payer_name: string;
  carc_code: string;
  rarc_code: string | null;
  denial_reason: string;
  denied_at: string;
  status: string;
  policy_id: string;
};

export async function getClaimBundle(claimId: string) {
  if (useMemoryStore()) {
    const claim = memoryDb.getClaim(claimId);
    if (!claim) return null;
    const policy = memoryDb.getPolicy(claim.policy_id);
    const notes = memoryDb.notesForClaim(claimId);
    const allowedPolicyCodes = memoryDb.listPolicies().map((p) => p.policy_code);
    return { claim, policy, notes, allowedPolicyCodes };
  }

  const db = getServiceDb();
  const { data: claim, error } = await db
    .from("denied_claims")
    .select("*")
    .eq("id", claimId)
    .single();
  if (error || !claim) return null;
  const { data: policy } = await db
    .from("payer_policies")
    .select("*")
    .eq("id", claim.policy_id)
    .single();
  const { data: notes } = await db
    .from("patient_ehr_notes")
    .select("*")
    .eq("claim_id", claimId)
    .order("authored_at", { ascending: true });
  const { data: allPolicies } = await db.from("payer_policies").select("policy_code");
  return {
    claim: claim as DbClaim,
    policy: (policy as DbPolicy) ?? null,
    notes: (notes ?? []) as DbNote[],
    allowedPolicyCodes: (allPolicies ?? []).map((p) => p.policy_code as string),
  };
}

export async function deactivateAppeals(claimId: string) {
  if (useMemoryStore()) {
    memoryDb.deactivateAppeals(claimId);
    return;
  }
  const db = getServiceDb();
  await db
    .from("appeals")
    .update({ is_active: false })
    .eq("claim_id", claimId)
    .eq("is_active", true);
}

export async function insertLiveAppeal(row: {
  id: string;
  claim_id: string;
  analysis: ValidatedAnalysis;
  model: string;
  latency_ms: number;
}) {
  const appealRow: AppealRow = {
    id: row.id,
    claim_id: row.claim_id,
    analysis: row.analysis as unknown as Record<string, unknown>,
    letter: row.analysis.letter as unknown as Record<string, unknown>,
    p2p: row.analysis.p2p as unknown as Record<string, unknown>,
    model: row.model,
    latency_ms: row.latency_ms,
    created_at: new Date().toISOString(),
    is_cached: false,
    is_active: true,
  };

  if (useMemoryStore()) {
    memoryDb.insertAppeal(appealRow);
    return;
  }
  const db = getServiceDb();
  const { error } = await db.from("appeals").insert(appealRow);
  if (error) throw error;
}

export async function getCachedAppeal(claimId: string): Promise<DbAppeal | null> {
  if (useMemoryStore()) {
    return (memoryDb.cachedAppeal(claimId) as unknown as DbAppeal) ?? null;
  }
  const db = getServiceDb();
  const { data: cached } = await db
    .from("appeals")
    .select("*")
    .eq("claim_id", claimId)
    .eq("is_cached", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (cached as DbAppeal) ?? null;
}

export async function activateCachedAppeal(
  claimId: string,
  validated?: ValidatedAnalysis,
): Promise<DbAppeal | null> {
  const cached = await getCachedAppeal(claimId);
  if (!cached) return null;

  if (useMemoryStore()) {
    if (validated) {
      memoryDb.activateAppeal(cached.id, {
        analysis: validated as unknown as Record<string, unknown>,
        letter: validated.letter as unknown as Record<string, unknown>,
        p2p: validated.p2p as unknown as Record<string, unknown>,
      });
    } else {
      memoryDb.activateAppeal(cached.id);
    }
    return memoryDb.listAppeals().find((a) => a.id === cached.id) as unknown as DbAppeal;
  }

  const db = getServiceDb();
  const update: Record<string, unknown> = { is_active: true };
  if (validated) {
    update.analysis = validated;
    update.letter = validated.letter;
    update.p2p = validated.p2p;
  }
  await db.from("appeals").update(update).eq("id", cached.id);
  return { ...cached, ...update } as DbAppeal;
}

export async function updateClaimStatus(claimId: string, status: string) {
  if (useMemoryStore()) {
    memoryDb.updateClaimStatus(claimId, status);
    return;
  }
  const db = getServiceDb();
  await db.from("denied_claims").update({ status }).eq("id", claimId);
}

export async function listPolicyCodes(): Promise<string[]> {
  if (useMemoryStore()) {
    return memoryDb.listPolicies().map((p) => p.policy_code);
  }
  const db = getServiceDb();
  const { data } = await db.from("payer_policies").select("policy_code");
  return (data ?? []).map((p) => p.policy_code as string);
}

export async function kpiSource() {
  if (useMemoryStore()) {
    return {
      claims: memoryDb.listClaims().map((c) => ({
        billed_amount: c.billed_amount,
        status: c.status,
      })),
      live: memoryDb
        .listAppeals()
        .filter((a) => !a.is_cached)
        .map((a) => ({ latency_ms: a.latency_ms })),
      cached: memoryDb
        .listAppeals()
        .filter((a) => a.is_cached)
        .map((a) => ({ latency_ms: a.latency_ms })),
    };
  }
  const db = getServiceDb();
  const { data: claims, error } = await db
    .from("denied_claims")
    .select("billed_amount, status");
  if (error) throw error;
  const { data: live } = await db
    .from("appeals")
    .select("latency_ms")
    .eq("is_cached", false);
  const { data: cached } = await db
    .from("appeals")
    .select("latency_ms")
    .eq("is_cached", true);
  return {
    claims: claims ?? [],
    live: live ?? [],
    cached: cached ?? [],
  };
}
