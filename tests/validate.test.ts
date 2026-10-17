import { describe, expect, it } from "vitest";
import {
  findVerbatim,
  filterCitations,
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
  it("keeps policy codes and regulations, strips others", () => {
    const { kept, dropped } = filterCitations(
      ["ORTHO-112", "29 CFR 2560.503-1", "Made-Up Statute 99", "CC-201"],
      ["ORTHO-112", "CC-201"],
    );
    expect(kept).toContain("ORTHO-112");
    expect(kept).toContain("CC-201");
    expect(kept).toContain("29 CFR 2560.503-1");
    expect(dropped).toContain("Made-Up Statute 99");
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
    );
    expect(result.analysis.verdict).toBe("weak");
    expect(result.analysis.evidence).toHaveLength(0);
    expect(result.analysis.letter.citations).toHaveLength(0);
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
      );
      expect(result.droppedEvidence, result.retryHints.join("; ")).toHaveLength(
        0,
      );
      expect(result.policyClauseValid).toBe(true);
      expect(result.analysis.verdict).toBe(claim.expected_verdict);
      expect(result.analysis.evidence.length).toBeGreaterThan(0);
    });
  }
});
