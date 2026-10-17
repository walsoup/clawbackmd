import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  activateCachedAppeal,
  deactivateAppeals,
  getCachedAppeal,
  getClaimBundle,
  insertLiveAppeal,
  updateClaimStatus,
} from "@/lib/data";
import { LLMError, runAnalysis } from "@/lib/pipeline";
import { verdictToStatus, type Analysis, type ValidatedAnalysis } from "@/lib/schemas";
import { validateAnalysis } from "@/lib/validate";
import type { PlanType } from "@/lib/regulations";

function newAppealId() {
  return `APL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let claimId: string;
  try {
    const body = await req.json();
    claimId = body.claimId;
    if (!claimId) throw new Error("claimId required");
  } catch {
    return NextResponse.json({ error: "claimId required" }, { status: 400 });
  }

  try {
    const bundle = await getClaimBundle(claimId);
    if (!bundle?.claim || !bundle.policy) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const { claim, policy, notes, allowedPolicyCodes } = bundle;

    await deactivateAppeals(claimId);

    try {
      const planType = (claim.plan_type ?? "unknown") as PlanType;
      const result = await runAnalysis({
        claim: {
          id: claim.id,
          patient_alias: claim.patient_alias,
          cpt_codes: claim.cpt_codes,
          billed_amount: Number(claim.billed_amount),
          payer_name: claim.payer_name,
          plan_type: planType,
          carc_code: claim.carc_code,
          rarc_code: claim.rarc_code,
          denial_reason: claim.denial_reason,
          denied_at: claim.denied_at,
        },
        policy: { policy_code: policy.policy_code, body: policy.body },
        notes: notes.map((n) => ({
          id: n.id,
          text: n.text,
          authored_at: n.authored_at,
        })),
        allowedPolicyCodes,
      });

      const appealId = newAppealId();
      await insertLiveAppeal({
        id: appealId,
        claim_id: claimId,
        analysis: result.analysis,
        model: result.model,
        latency_ms: result.latency_ms,
      });

      const status = verdictToStatus(result.analysis.verdict);
      await updateClaimStatus(claimId, status);

      return NextResponse.json({
        ok: true,
        fallback: false,
        claimId,
        status,
        appeal: {
          id: appealId,
          model: result.model,
          latency_ms: result.latency_ms,
          is_cached: false,
          analysis: result.analysis,
          letter: result.analysis.letter,
          p2p: result.analysis.p2p,
          created_at: new Date().toISOString(),
        },
        retried: result.retried,
        droppedEvidence: result.droppedEvidence,
        droppedCitations: result.droppedCitations,
      });
    } catch (e) {
      if (!(e instanceof LLMError) && !(e instanceof Error)) throw e;

      const peek = await getCachedAppeal(claimId);
      if (!peek) {
        return NextResponse.json(
          {
            error: `Model unavailable and no cached appeal: ${e instanceof Error ? e.message : String(e)}`,
          },
          { status: 503 },
        );
      }

      const rawAnalysis = peek.analysis as unknown as Analysis;
      const planType = (claim.plan_type ?? "unknown") as PlanType;
      const validated = validateAnalysis(
        rawAnalysis,
        notes.map((n) => ({
          id: n.id,
          text: n.text,
          authored_at: n.authored_at,
        })),
        { policy_code: policy.policy_code, body: policy.body },
        allowedPolicyCodes,
        {
          planType,
          claimFacts: {
            id: claim.id,
            patient_alias: claim.patient_alias,
            cpt_codes: claim.cpt_codes,
            carc_code: claim.carc_code,
            denial_reason: claim.denial_reason,
          },
        },
      );

      const cached = await activateCachedAppeal(claimId, validated.analysis);
      if (!cached) {
        return NextResponse.json(
          { error: "Failed to activate cached appeal" },
          { status: 503 },
        );
      }

      const status = verdictToStatus(validated.analysis.verdict);
      await updateClaimStatus(claimId, status);

      return NextResponse.json({
        ok: true,
        fallback: true,
        reason: e instanceof Error ? e.message : String(e),
        claimId,
        status,
        appeal: {
          id: cached.id,
          model: cached.model,
          latency_ms: cached.latency_ms,
          is_cached: true,
          analysis: validated.analysis as ValidatedAnalysis,
          letter: validated.analysis.letter,
          p2p: validated.analysis.p2p,
          created_at: cached.created_at,
        },
      });
    }
  } catch (e) {
    console.error("analyze failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
