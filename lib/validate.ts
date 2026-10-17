import type {
  Analysis,
  ValidatedAnalysis,
  ValidatedEvidence,
  ValidatedPolicyClause,
} from "./schemas";
import { regulationCodes } from "./regulations";

export type NoteSource = {
  id: string;
  text: string;
  authored_at: string;
};

export type PolicySource = {
  policy_code: string;
  body: string;
};

export type ValidationResult = {
  analysis: ValidatedAnalysis;
  droppedEvidence: string[];
  policyClauseValid: boolean;
  droppedCitations: string[];
  needsRetry: boolean;
  retryHints: string[];
};

/** Normalize whitespace and smart quotes for fuzzy substring match. */
function normalize(s: string): { normalized: string; indexMap: number[] } {
  const indexMap: number[] = [];
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    // Smart quotes → straight
    if (ch === "\u2018" || ch === "\u2019" || ch === "\u201A") {
      out += "'";
      indexMap.push(i);
      i++;
      continue;
    }
    if (ch === "\u201C" || ch === "\u201D" || ch === "\u201E") {
      out += '"';
      indexMap.push(i);
      i++;
      continue;
    }
    // Collapse whitespace runs to a single space
    if (/\s/.test(ch)) {
      if (out.length === 0 || out[out.length - 1] !== " ") {
        out += " ";
        indexMap.push(i);
      }
      i++;
      while (i < s.length && /\s/.test(s[i]!)) i++;
      continue;
    }
    out += ch;
    indexMap.push(i);
    i++;
  }
  return { normalized: out, indexMap };
}

export function findVerbatim(
  quote: string,
  source: string,
): { start: number; end: number } | null {
  if (!quote || !source) return null;

  // Exact match first
  const exact = source.indexOf(quote);
  if (exact !== -1) {
    return { start: exact, end: exact + quote.length };
  }

  // Normalized match
  const src = normalize(source);
  const q = normalize(quote.trim());
  if (!q.normalized) return null;

  const idx = src.normalized.indexOf(q.normalized);
  if (idx === -1) return null;

  const start = src.indexMap[idx];
  const lastNormIdx = idx + q.normalized.length - 1;
  const endChar = src.indexMap[lastNormIdx];
  if (start === undefined || endChar === undefined) return null;
  return { start, end: endChar + 1 };
}

function normalizeCitation(c: string): string {
  return c.trim().replace(/\s+/g, " ").toLowerCase();
}

export function filterCitations(
  citations: string[],
  allowedPolicyCodes: string[],
  extraAllowed: string[] = [],
): { kept: string[]; dropped: string[] } {
  const allowed = new Set(
    [...allowedPolicyCodes, ...regulationCodes(), ...extraAllowed].map(
      normalizeCitation,
    ),
  );
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of citations) {
    if (allowed.has(normalizeCitation(c))) {
      kept.push(c);
    } else {
      dropped.push(c);
    }
  }
  return { kept, dropped };
}

export function validateAnalysis(
  raw: Analysis,
  notes: NoteSource[],
  policy: PolicySource,
  allowedPolicyCodes: string[],
  extraCitationAllow: string[] = [],
): ValidationResult {
  const noteById = new Map(notes.map((n) => [n.id, n]));
  const droppedEvidence: string[] = [];
  const retryHints: string[] = [];
  const validEvidence: ValidatedEvidence[] = [];

  for (const ev of raw.evidence) {
    const note = noteById.get(ev.note_id);
    if (!note) {
      droppedEvidence.push(ev.quote);
      retryHints.push(
        `Evidence note_id "${ev.note_id}" not found. Use an exact note id from the prompt.`,
      );
      continue;
    }
    const loc = findVerbatim(ev.quote, note.text);
    if (!loc) {
      droppedEvidence.push(ev.quote);
      retryHints.push(
        `Evidence quote is not a verbatim substring of note ${ev.note_id}. Copy the exact text from the note.`,
      );
      continue;
    }
    validEvidence.push({
      quote: note.text.slice(loc.start, loc.end),
      note_id: ev.note_id,
      timestamp: note.authored_at,
      start: loc.start,
      end: loc.end,
    });
  }

  let policyClause: ValidatedPolicyClause | null = null;
  let policyClauseValid = false;
  if (
    raw.policy_clause.policy_code === policy.policy_code ||
    raw.policy_clause.policy_code === policy.policy_code.replace(/^POL-/, "")
  ) {
    const loc = findVerbatim(raw.policy_clause.quote, policy.body);
    if (loc) {
      policyClause = {
        policy_code: policy.policy_code,
        quote: policy.body.slice(loc.start, loc.end),
        start: loc.start,
        end: loc.end,
      };
      policyClauseValid = true;
    } else {
      retryHints.push(
        `policy_clause.quote is not a verbatim substring of policy ${policy.policy_code}. Copy exact text from the policy body.`,
      );
    }
  } else {
    retryHints.push(
      `policy_clause.policy_code must be "${policy.policy_code}".`,
    );
  }

  const { kept, dropped: droppedCitations } = filterCitations(
    raw.letter.citations,
    allowedPolicyCodes,
    extraCitationAllow,
  );

  let verdict = raw.verdict;
  // Force weak if appeal with zero valid evidence, or nothing valid survives
  if (verdict === "appeal" && validEvidence.length === 0) {
    verdict = "weak";
  }
  if (validEvidence.length === 0 && !policyClauseValid) {
    verdict = "weak";
  }

  const needsRetry = retryHints.length > 0;

  const analysis: ValidatedAnalysis = {
    ...raw,
    verdict,
    policy_clause: policyClause,
    evidence: validEvidence,
    letter: {
      ...raw.letter,
      citations: kept,
    },
  };

  return {
    analysis,
    droppedEvidence,
    policyClauseValid,
    droppedCitations,
    needsRetry,
    retryHints,
  };
}
