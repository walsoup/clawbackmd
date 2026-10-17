/**
 * Hardcoded citation allowlist — each entry reviewed for this synthetic demo.
 * Citations in appeal letters may only reference these codes plus
 * payer_policies.policy_code values present in the store.
 *
 * Note: these are public CFR titles for demo citation filtering only —
 * not legal advice. Confirm with counsel before production use.
 */
export type RegulationEntry = {
  code: string;
  title: string;
  reviewedBy: string;
  reviewedAt: string;
};

export const REGULATIONS: RegulationEntry[] = [
  {
    code: "29 CFR 2560.503-1",
    title: "ERISA claims procedure rule",
    reviewedBy: "demo-maintainer",
    reviewedAt: "2026-10-17",
  },
  {
    code: "45 CFR 147.136",
    title: "ACA internal claims and appeals rule",
    reviewedBy: "demo-maintainer",
    reviewedAt: "2026-10-17",
  },
  {
    code: "42 CFR 422.101(b)(6)",
    title: "Medicare Advantage coverage-criteria rule",
    reviewedBy: "demo-maintainer",
    reviewedAt: "2026-10-17",
  },
];

export function regulationCodes(): string[] {
  return REGULATIONS.map((r) => r.code);
}
