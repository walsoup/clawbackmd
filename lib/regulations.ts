/**
 * Hardcoded citation allowlist — each entry reviewed for this synthetic demo.
 * Regulations are attached SERVER-SIDE from plan_type, never invented by the LLM.
 *
 * Note: these are public CFR titles for demo citation filtering only —
 * not legal advice. Confirm with counsel before production use.
 */

export type PlanType =
  | "erisa"
  | "aca_individual"
  | "medicare_advantage"
  | "unknown";

export type RegulationEntry = {
  code: string;
  title: string;
  planTypes: PlanType[];
  reviewedBy: string;
  reviewedAt: string;
};

export const REGULATIONS: RegulationEntry[] = [
  {
    code: "29 CFR 2560.503-1",
    title: "ERISA claims procedure rule",
    planTypes: ["erisa"],
    reviewedBy: "demo-maintainer",
    reviewedAt: "2026-10-17",
  },
  {
    code: "45 CFR 147.136",
    title: "ACA internal claims and appeals rule",
    planTypes: ["aca_individual"],
    reviewedBy: "demo-maintainer",
    reviewedAt: "2026-10-17",
  },
  {
    code: "42 CFR 422.101(b)(6)",
    title: "Medicare Advantage coverage-criteria rule",
    planTypes: ["medicare_advantage"],
    reviewedBy: "demo-maintainer",
    reviewedAt: "2026-10-17",
  },
];

export function regulationCodes(): string[] {
  return REGULATIONS.map((r) => r.code);
}

/** Regulations that apply to a known plan type. Empty when plan type is unknown. */
export function regulationsForPlan(planType: PlanType | undefined): string[] {
  if (!planType || planType === "unknown") return [];
  return REGULATIONS.filter((r) => r.planTypes.includes(planType)).map(
    (r) => r.code,
  );
}

export function isRegulationCode(code: string): boolean {
  const n = code.trim().replace(/\s+/g, " ").toLowerCase();
  return REGULATIONS.some(
    (r) => r.code.trim().replace(/\s+/g, " ").toLowerCase() === n,
  );
}

export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  erisa: "ERISA / employer group",
  aca_individual: "ACA individual / exchange",
  medicare_advantage: "Medicare Advantage",
  unknown: "Unknown plan type",
};
