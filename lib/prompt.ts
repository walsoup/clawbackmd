import type { ChatMessage } from "./llm";
import type { NoteSource, PolicySource } from "./validate";
import type { PlanType } from "./regulations";
import { PLAN_TYPE_LABEL } from "./regulations";

export type ClaimContext = {
  id: string;
  patient_alias: string;
  cpt_codes: string[];
  billed_amount: number;
  payer_name: string;
  carc_code: string;
  rarc_code: string | null;
  denial_reason: string;
  denied_at: string;
  plan_type?: PlanType;
};

const SYSTEM_PROMPT = `You are a hospital billing appeals analyst. You draft APPEAL MATERIALS for insurance denials using ONLY the claim, policy, and EHR notes provided.

All data is SYNTHETIC. Your output is a DRAFT requiring separate physician AND billing review — never final clinical or legal advice. You do NOT authorize write-offs.

Return a single JSON object matching this schema exactly:
{
  "verdict": "appeal" | "weak" | "uphold_denial",
  "confidence": number between 0 and 1,
  "denial_reason": string,
  "policy_clause": { "policy_code": string, "quote": string },
  "evidence": [{ "quote": string, "note_id": string, "timestamp": string }],
  "gaps": string[],
  "letter": {
    "sections": [{ "heading": string, "body": string }],
    "citations": string[]
  },
  "p2p": {
    "opening": string,
    "talking_points": string[],
    "likely_pushback": [{ "objection": string, "response": string }],
    "ask": string
  }
}

HARD RULES:
1. Every evidence.quote MUST be a VERBATIM contiguous substring of the named note's text. Copy-paste exactly. Do not paraphrase.
2. policy_clause.quote MUST be a VERBATIM contiguous substring of the policy body. policy_code must match the provided policy.
3. evidence.note_id must be an exact note id from the prompt (e.g. N-101).
4. evidence.timestamp should match the note's timestamp.
5. letter.citations may ONLY list payer policy codes from the Allowed Citations list. NEVER list CFR/statute codes — the server attaches those from plan type.
6. Never invent CPT codes, lab values, dates, or clinical findings not present in the notes.
7. Every clinical fact in letter.sections (numbers, grades, times, labs, durations) MUST appear in an evidence.quote you cited. Do not paraphrase findings into new numbers.
8. Use verdict "uphold_denial" when the chart does NOT currently support overturning the denial. This means DOCUMENTATION GAP — recommend querying the attending before write-off. It is NOT an instruction to abandon the claim.
9. Use verdict "appeal" when documented evidence clearly meets a policy exception or criterion the denial ignored.
10. Use verdict "weak" when evidence is incomplete or ambiguous.
11. denial_reason should restate the insurer's stated reason.
12. letter.sections should be a professional appeal letter DRAFT (Patient/claim identifiers as aliases only). For uphold_denial, write an INTERNAL assessment titled as a documentation-gap / attending-query note — not "do not appeal / write off".
13. p2p is a peer-to-peer physician cheat sheet. Include talking points that quote or closely track evidence. For uphold_denial, frame as internal huddle: query attending, do not auto-write-off.`;

export function buildPrompt(args: {
  claim: ClaimContext;
  policy: PolicySource;
  notes: NoteSource[];
  allowedCitations: string[];
}): ChatMessage[] {
  const { claim, policy, notes, allowedCitations } = args;

  const notesBlock = notes
    .map(
      (n) =>
        `[NOTE ${n.id} | ${n.authored_at}]\n${n.text}`,
    )
    .join("\n\n");

  const planType = claim.plan_type ?? "unknown";
  const planLabel = PLAN_TYPE_LABEL[planType];

  const user = `CLAIM
id: ${claim.id}
patient_alias: ${claim.patient_alias}
cpt_codes: ${claim.cpt_codes.join(", ")}
billed_amount: ${claim.billed_amount}
payer_name: ${claim.payer_name}
plan_type: ${planType} (${planLabel}) — for context only; do NOT cite statutes
carc_code: ${claim.carc_code}
rarc_code: ${claim.rarc_code ?? "n/a"}
denied_at: ${claim.denied_at}
denial_reason: ${claim.denial_reason}

[POLICY ${policy.policy_code}]
${policy.body}

EHR NOTES
${notesBlock}

Allowed Citations (policy codes ONLY — no CFR/statutes):
${allowedCitations.join(", ")}

Analyze whether the denial should be appealed. Return JSON only.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

export function buildRetryMessages(
  prior: ChatMessage[],
  priorAssistantRaw: string,
  hints: string[],
): ChatMessage[] {
  return [
    ...prior,
    { role: "assistant", content: priorAssistantRaw },
    {
      role: "user",
      content: `Your previous JSON failed validation. Fix it and return a complete corrected JSON object.

Failures:
${hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Remember: quotes must be exact contiguous substrings copy-pasted from the notes/policy. Letter clinical facts must appear in evidence quotes. Citations = policy codes only.`,
    },
  ];
}
