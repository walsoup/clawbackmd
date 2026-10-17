import { describe, expect, it } from "vitest";
import {
  findVerbatim,
  filterCitations,
  scrubLetterProvenance,
  validateAnalysis,
} from "@/lib/validate";
import { SEED_CLAIMS, SEED_NOTES, SEED_POLICIES } from "@/data/seed";
import { CACHED_APPEALS } from "@/data/cached-appeals";
import type { Analysis } from "@/lib/schemas";

describe("findVerbatim", () => {
  it("finds exact substrings", () => {
    const src = "Serum lactate 4.8 mmol/L (ref < 2.0).";
    const loc = findVerbatim("lactate 4.8 mmol/L", src);
    expect(loc).not.toBeNull();
    expect(src.slice(loc!.start, loc!.end)).toBe("lactate 4.8 mmol/L");
  });

  it("matches normalized whitespace and smart quotes", () => {
    const src = 'He said \u201Cthunderclap\u201D onset.';
    const loc = findVerbatim('said "thunderclap" onset', src);
    expect(loc).not.toBeNull();
  });

  it("returns null when not present", () => {
    expect(findVerbatim("invented quote", "real note text")).toBeNull();
  });
});

describe("filterCitations", () => {
  it("keeps policy codes and strips LLM-supplied statutes", () => {
    const { kept, dropped } = filterCitations(
      ["ORTHO-112", "29 CFR 2560.503-1", "Made-Up Statute 99", "CC-201"],
      ["ORTHO-112", "CC-201"],
    );
    expect(kept).toContain("ORTHO-112");
    expect(kept).toContain("CC-201");
    expect(kept).not.toContain("29 CFR 2560.503-1");
    expect(dropped).toContain("29 CFR 2560.503-1");
    expect(dropped).toContain("Made-Up Statute 99");
  });
});

describe("scrubLetterProvenance", () => {
  it("drops sentences with clinical atoms missing from evidence", () => {
    const { sections, dropped } = scrubLetterProvenance(
      [
        {
          heading: "Appeal",
          body: "We respectfully appeal. Lactate was 9.9 mmol/L. Please overturn.",
        },
      ],
      ["Serum lactate 4.8 mmol/L"],
    );
    expect(dropped.some((d) => d.includes("9.9"))).toBe(true);
    expect(sections[0]!.body).not.toContain("9.9");
    expect(sections[0]!.body).toMatch(/respectfully appeal|overturn/i);
  });

  it("keeps sentences grounded in evidence quotes", () => {
    const { dropped, sections } = scrubLetterProvenance(
      [
        {
          heading: "Evidence",
          body: "Lactate was 4.8 mmol/L after fluids.",
        },
      ],
      ["Serum lactate 4.8 mmol/L (ref < 2.0)."],
    );
    expect(dropped).toHaveLength(0);
    expect(sections[0]!.body).toContain("4.8");
  });
});

describe("validateAnalysis force-weak", () => {
  it("forces weak when appeal has zero valid evidence", () => {
    const policy = SEED_POLICIES[0]!;
    const notes = SEED_NOTES.filter((n) => n.claim_id === "CLM-001");
    const raw: Analysis = {
      verdict: "appeal",
      confidence: 0.9,
      denial_reason: "x",
      policy_clause: {
        policy_code: "ORTHO-112",
        quote: "not in the policy at all xyzzy",
      },
      evidence: [
        {
          quote: "totally fabricated evidence",
          note_id: "N-101",
          timestamp: "2026-01-01T00:00:00Z",
        },
      ],
      gaps: [],
      letter: { sections: [], citations: ["FAKE-LAW"] },
      p2p: {
        opening: "",
        talking_points: [],
        likely_pushback: [],
        ask: "",
      },
    };
    const result = validateAnalysis(
      raw,
      notes,
      { policy_code: policy.policy_code, body: policy.body },
      ["ORTHO-112"],
      { planType: "erisa" },
    );
    expect(result.analysis.verdict).toBe("weak");
    expect(result.analysis.evidence).toHaveLength(0);
    expect(result.analysis.letter.citations).toEqual([
      "29 CFR 2560.503-1",
    ]);
  });

  it("attaches ERISA cite by plan type, not LLM", () => {
    const policy = SEED_POLICIES[0]!;
    const notes = SEED_NOTES.filter((n) => n.claim_id === "CLM-001");
    const quote =
      "Patient A-7421 completed 14 weeks of supervised physical therapy (28 visits spanning 2026-03-02 through 2026-06-09).";
    const policyQuote =
      "The 12-week conservative therapy requirement is waived when weight-bearing radiographs demonstrate Kellgren-Lawrence grade 4 osteoarthritis with bone-on-bone articulation.";
    const raw: Analysis = {
      verdict: "appeal",
      confidence: 0.9,
      denial_reason: "x",
      policy_clause: { policy_code: "ORTHO-112", quote: policyQuote },
      evidence: [
        {
          quote,
          note_id: "N-103",
          timestamp: "2026-06-09T11:00:00Z",
        },
      ],
      gaps: [],
      letter: {
        sections: [
          {
            heading: "Request",
            body: "We request overturn. DRAFT pending physician and billing review.",
          },
        ],
        citations: ["ORTHO-112", "42 CFR 422.101(b)(6)"],
      },
      p2p: {
        opening: "hi",
        talking_points: [],
        likely_pushback: [],
        ask: "overturn",
      },
    };
    const result = validateAnalysis(
      raw,
      notes,
      { policy_code: policy.policy_code, body: policy.body },
      ["ORTHO-112"],
      {
        planType: "erisa",
        claimFacts: { cpt_codes: ["27447"], carc_code: "CO-50" },
      },
    );
    expect(result.analysis.letter.citations).toContain("ORTHO-112");
    expect(result.analysis.letter.citations).toContain("29 CFR 2560.503-1");
    expect(result.analysis.letter.citations).not.toContain(
      "42 CFR 422.101(b)(6)",
    );
  });
});

describe("cached appeals pass validators", () => {
  for (const cached of CACHED_APPEALS) {
    it(`${cached.claim_id} (${cached.id})`, () => {
      const claim = SEED_CLAIMS.find((c) => c.id === cached.claim_id)!;
      const policy = SEED_POLICIES.find((p) => p.id === claim.policy_id)!;
      const notes = SEED_NOTES.filter((n) => n.claim_id === claim.id);
      const result = validateAnalysis(
        cached.analysis,
        notes.map((n) => ({
          id: n.id,
          text: n.text,
          authored_at: n.authored_at,
        })),
        { policy_code: policy.policy_code, body: policy.body },
        SEED_POLICIES.map((p) => p.policy_code),
        {
          planType: claim.plan_type,
          claimFacts: {
            id: claim.id,
            patient_alias: claim.patient_alias,
            cpt_codes: claim.cpt_codes,
            carc_code: claim.carc_code,
            denial_reason: claim.denial_reason,
          },
        },
      );
      expect(result.droppedEvidence, result.retryHints.join("; ")).toHaveLength(
        0,
      );
      expect(result.policyClauseValid).toBe(true);
      expect(result.analysis.verdict).toBe(claim.expected_verdict);
      expect(result.analysis.evidence.length).toBeGreaterThan(0);
      expect(result.droppedLetterSentences).toHaveLength(0);
      // Plan-matched CFR attached when plan type is known
      if (claim.plan_type === "erisa") {
        expect(result.analysis.letter.citations).toContain(
          "29 CFR 2560.503-1",
        );
      }
      if (claim.plan_type === "aca_individual" && claim.expected_verdict === "appeal") {
        expect(result.analysis.letter.citations).toContain("45 CFR 147.136");
      }
      if (claim.plan_type === "medicare_advantage") {
        expect(result.analysis.letter.citations).toContain(
          "42 CFR 422.101(b)(6)",
        );
      }
      if (claim.expected_verdict === "uphold_denial") {
        expect(result.analysis.gaps[0]).toMatch(/query|attending|documentation/i);
        expect(result.analysis.p2p.ask).toMatch(/query|attending/i);
      }
    });
  }
});
