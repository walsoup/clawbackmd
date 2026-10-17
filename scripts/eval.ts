/**
 * npm run eval — run the analysis pipeline against all 5 seed claims.
 * Requires a running OpenAI-compatible endpoint (default: Ollama + gemma3).
 */
import { SEED_CLAIMS, SEED_NOTES, SEED_POLICIES } from "../data/seed";
import { runAnalysis } from "../lib/pipeline";

async function main() {
  console.log("ClawbackMD eval — 5 seed claims\n");
  console.log(
    `LLM: ${process.env.LLM_BASE_URL ?? "http://localhost:11434/v1"} model=${process.env.LLM_MODEL ?? "gemma3"}\n`,
  );

  const allowed = SEED_POLICIES.map((p) => p.policy_code);
  let pass = 0;

  for (const claim of SEED_CLAIMS) {
    const policy = SEED_POLICIES.find((p) => p.id === claim.policy_id)!;
    const notes = SEED_NOTES.filter((n) => n.claim_id === claim.id);

    process.stdout.write(`${claim.id} (${claim.expected_verdict}) … `);
    try {
      const result = await runAnalysis({
        claim: {
          id: claim.id,
          patient_alias: claim.patient_alias,
          cpt_codes: claim.cpt_codes,
          billed_amount: claim.billed_amount,
          payer_name: claim.payer_name,
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
        allowedPolicyCodes: allowed,
      });

      const ok = result.analysis.verdict === claim.expected_verdict;
      if (ok) pass++;
      console.log(
        `${ok ? "PASS" : "FAIL"} actual=${result.analysis.verdict} evidence=${result.analysis.evidence.length} dropped=${result.droppedEvidence.length} retry=${result.retried} latency=${result.latency_ms}ms`,
      );
      if (result.droppedEvidence.length) {
        console.log("  dropped quotes:", result.droppedEvidence);
      }
    } catch (e) {
      console.log(`ERROR ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n${pass}/${SEED_CLAIMS.length} expected verdicts matched`);
  process.exit(pass === SEED_CLAIMS.length ? 0 : 1);
}

main();
