import { z } from "zod";

export const CLAIM_STATUSES = [
  "denied",
  "analyzed",
  "appeal_ready",
  "uphold",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const VerdictSchema = z.enum(["appeal", "weak", "uphold_denial"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const PolicyClauseSchema = z.object({
  policy_code: z.string(),
  quote: z.string(),
});

export const EvidenceItemSchema = z.object({
  quote: z.string(),
  note_id: z.string(),
  timestamp: z.string(),
});

export const LetterSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

export const LetterSchema = z.object({
  sections: z.array(LetterSectionSchema),
  citations: z.array(z.string()),
});

export const PushbackSchema = z.object({
  objection: z.string(),
  response: z.string(),
});

export const P2PSchema = z.object({
  opening: z.string(),
  talking_points: z.array(z.string()),
  likely_pushback: z.array(PushbackSchema),
  ask: z.string(),
});

export const AnalysisSchema = z.object({
  verdict: VerdictSchema,
  confidence: z.number().min(0).max(1),
  denial_reason: z.string(),
  policy_clause: PolicyClauseSchema,
  evidence: z.array(EvidenceItemSchema),
  gaps: z.array(z.string()),
  letter: LetterSchema,
  p2p: P2PSchema,
});

export type Analysis = z.infer<typeof AnalysisSchema>;

/** Evidence with computed highlight offsets into the source note text. */
export const ValidatedEvidenceSchema = EvidenceItemSchema.extend({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const ValidatedPolicyClauseSchema = PolicyClauseSchema.extend({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const ValidatedAnalysisSchema = AnalysisSchema.extend({
  policy_clause: ValidatedPolicyClauseSchema.nullable(),
  evidence: z.array(ValidatedEvidenceSchema),
  /** Sentences removed because clinical atoms were not in validated evidence. */
  letter_warnings: z.array(z.string()).default([]),
});

export type ValidatedAnalysis = z.infer<typeof ValidatedAnalysisSchema>;
export type ValidatedEvidence = z.infer<typeof ValidatedEvidenceSchema>;
export type ValidatedPolicyClause = z.infer<typeof ValidatedPolicyClauseSchema>;

export function verdictToStatus(verdict: Verdict): ClaimStatus {
  switch (verdict) {
    case "appeal":
      return "appeal_ready";
    case "weak":
      return "analyzed";
    case "uphold_denial":
      return "uphold";
  }
}
