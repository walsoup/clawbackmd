import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listPolicyCodes } from "@/lib/data";
import { LLMError, runAnalysis } from "@/lib/pipeline";
import { buildSimulateFallback } from "@/lib/simulate-fallback";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: {
    payer?: string;
    carc?: string;
    denialReason?: string;
    clinicalNote?: string;
    policyCode?: string;
    policyText?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denialReason = (body.denialReason ?? "").trim();
  const clinicalNote = (body.clinicalNote ?? "").trim();
  if (!denialReason || !clinicalNote) {
    return NextResponse.json(
      { error: "denialReason and clinicalNote are required" },
      { status: 400 },
    );
  }

  const policyCode = (body.policyCode ?? "SIM-POLICY").trim() || "SIM-POLICY";
  const policyText =
    (body.policyText ?? "").trim() ||
    `Example policy ${policyCode}: Review the clinical documentation against the stated denial reason. Coverage requires documented medical necessity supporting the billed service. Exceptions apply when red-flag features or explicit policy waivers are documented in the chart.`;

  const noteAt = new Date().toISOString();
  const note = {
    id: "SIM-NOTE-1",
    text: clinicalNote,
    authored_at: noteAt,
  };
  const policy = { policy_code: policyCode, body: policyText };
  const allowedPolicyCodes = await listPolicyCodes();

  try {
    const result = await runAnalysis({
      claim: {
        id: "SIM-CLAIM",
        patient_alias: "Example Patient",
        cpt_codes: ["SIM"],
        billed_amount: 0,
        payer_name: body.payer?.trim() || "Example Payer",
        carc_code: body.carc?.trim() || "CO-50",
        rarc_code: null,
        denial_reason: denialReason,
        denied_at: new Date().toISOString(),
      },
      policy,
      notes: [note],
      allowedPolicyCodes,
      extraCitationAllow: [policyCode],
    });

    return NextResponse.json({
      ok: true,
      fallback: false,
      analysis: result.analysis,
      model: result.model,
      latency_ms: result.latency_ms,
      retried: result.retried,
      policy,
      note,
      denial_reason: denialReason,
    });
  } catch (e) {
    const reason =
      e instanceof LLMError || e instanceof Error ? e.message : String(e);
    const analysis = buildSimulateFallback({
      denialReason,
      policyCode,
      policyText,
      noteId: note.id,
      noteText: note.text,
      noteAt: note.authored_at,
      allowedPolicyCodes,
    });

    return NextResponse.json({
      ok: true,
      fallback: true,
      reason,
      analysis,
      model: "offline-fallback",
      latency_ms: 0,
      policy,
      note,
      denial_reason: denialReason,
    });
  }
}
