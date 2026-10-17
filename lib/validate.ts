import type {
  Analysis,
  ValidatedAnalysis,
  ValidatedEvidence,
  ValidatedPolicyClause,
} from "./schemas";
import {
  isRegulationCode,
  regulationsForPlan,
  type PlanType,
} from "./regulations";

export type NoteSource = {
  id: string;
  text: string;
  authored_at: string;
};

export type PolicySource = {
  policy_code: string;
  body: string;
};

export type ClaimFacts = {
  id?: string;
  patient_alias?: string;
  cpt_codes?: string[];
  carc_code?: string;
  denial_reason?: string;
};

export type ValidateOptions = {
  extraCitationAllow?: string[];
  planType?: PlanType;
  claimFacts?: ClaimFacts;
};

export type ValidationResult = {
  analysis: ValidatedAnalysis;
  droppedEvidence: string[];
  policyClauseValid: boolean;
  droppedCitations: string[];
  droppedLetterSentences: string[];
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

/**
 * Keep policy codes (+ extras). Strip invented statutes.
 * Plan-matched regulations are attached separately — never trusted from the LLM.
 */
export function filterCitations(
  citations: string[],
  allowedPolicyCodes: string[],
  extraAllowed: string[] = [],
): { kept: string[]; dropped: string[] } {
  const allowed = new Set(
    [...allowedPolicyCodes, ...extraAllowed].map(normalizeCitation),
  );
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of citations) {
    if (isRegulationCode(c)) {
      // LLM must not invent/select statutes — server attaches by plan_type
      dropped.push(c);
      continue;
    }
    if (allowed.has(normalizeCitation(c))) {
      kept.push(c);
    } else {
      dropped.push(c);
    }
  }
  return { kept, dropped };
}

/** Merge policy citations with regulations that match the claim's plan type. */
export function attachPlanCitations(
  policyCitations: string[],
  planType: PlanType | undefined,
): string[] {
  const regs = regulationsForPlan(planType);
  const seen = new Set(policyCitations.map(normalizeCitation));
  const out = [...policyCitations];
  for (const r of regs) {
    if (!seen.has(normalizeCitation(r))) {
      out.push(r);
      seen.add(normalizeCitation(r));
    }
  }
  return out;
}

const CLINICAL_ATOM =
  /\b(?:\d{1,3}(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*(?:mmHg|mmol\/L|mL\/kg|mcg\/kg\/min|weeks?|days?|minutes?|visits?|sessions?|months?)|days?\s+\d+|\d+\s*days?\s+post|KL(?:\s*grade)?\s*[1-4]|Kellgren-Lawrence\s*grade\s*[1-4]|LVEF\s*(?:of\s*|estimated\s+at\s*)?\d{1,3}\s*%?|CPT\s*\d{5}|NYHA\s*(?:class\s*)?[IVX]+|MAP\s*[<>≤≥]?\s*\d+|Sepsis-3|bone-on-bone|thunderclap|CN\s*III|cranial\s*nerve\s*III|grade\s*[34]|CO-\d{1,3}|\d{4}-\d{2}-\d{2})\b/gi;

const BOILERPLATE =
  /^(we\s+(respectfully\s+)?(appeal|request)|overturn|restore|authorize|payment|draft|pending|physician|billing|review|thank you|peer-to-peer|internal\s+(assessment|only|note)|documentation\s+gap|query\s+(the\s+)?attending|do\s+not\s+send)/i;

function normalizeAtomCorpus(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/nyha\s+class\s+/g, "nyha ")
    .replace(/kellgren-lawrence\s+grade/g, "kl grade")
    .replace(/lvef\s+(?:estimated\s+at\s+|of\s+)/g, "lvef ")
    .replace(/cranial\s+nerve\s+iii/g, "cn iii")
    .replace(/days?\s+(\d+)/g, "$1 days")
    .replace(/(\d+)\s*days?\s+post/g, "$1 days");
}

function extractClinicalAtoms(text: string): string[] {
  const atoms: string[] = [];
  const re = new RegExp(CLINICAL_ATOM.source, CLINICAL_ATOM.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    atoms.push(m[0].replace(/\s+/g, " ").trim());
  }
  return atoms;
}

function atomInCorpus(atom: string, corpusNorm: string): boolean {
  const a = normalizeAtomCorpus(atom);
  if (!a) return true;
  if (corpusNorm.includes(a)) return true;
  const compact = a.replace(/\s+/g, "");
  if (corpusNorm.replace(/\s+/g, "").includes(compact)) return true;
  // Numeric / unit core: "lvef 28%" → also try "28%"
  const cores = a.match(
    /\d+(?:\.\d+)?(?:\s*%|\s*mmhg|\s*mmol\/l|\s*ml\/kg|\s*weeks?|\s*days?|\s*minutes?|\s*visits?|\s*months?)?/g,
  );
  if (cores) {
    for (const core of cores) {
      const c = core.replace(/\s+/g, " ").trim();
      if (c.length >= 2 && corpusNorm.includes(c)) return true;
      if (c.length >= 2 && corpusNorm.replace(/\s+/g, "").includes(c.replace(/\s+/g, "")))
        return true;
    }
  }
  return false;
}

function splitSentences(body: string): string[] {
  const parts = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : body.trim() ? [body.trim()] : [];
}

/**
 * Drop letter sentences that assert clinical atoms not present in validated
 * evidence / policy quotes / claim facts. Boilerplate without atoms is kept.
 */
export function scrubLetterProvenance(
  sections: Array<{ heading: string; body: string }>,
  groundingTexts: string[],
): {
  sections: Array<{ heading: string; body: string }>;
  dropped: string[];
  warnings: string[];
} {
  const corpusNorm = normalizeAtomCorpus(groundingTexts.join("\n"));
  const dropped: string[] = [];
  const warnings: string[] = [];

  const next = sections.map((sec) => {
    const kept: string[] = [];
    for (const sentence of splitSentences(sec.body)) {
      const atoms = extractClinicalAtoms(sentence);
      if (atoms.length === 0) {
        kept.push(sentence);
        continue;
      }
      const unsupported = atoms.filter((a) => !atomInCorpus(a, corpusNorm));
      if (unsupported.length === 0) {
        kept.push(sentence);
        continue;
      }
      // Pure boilerplate with a hanging atom still drops — clinical risk
      if (BOILERPLATE.test(sentence) && unsupported.length === atoms.length) {
        // e.g. "We appeal CPT 99999" with invented CPT
        dropped.push(sentence);
        warnings.push(
          `Letter sentence removed — ungrounded: ${unsupported.join(", ")}`,
        );
        continue;
      }
      dropped.push(sentence);
      warnings.push(
        `Letter sentence removed — ungrounded: ${unsupported.join(", ")}`,
      );
    }
    return {
      heading: sec.heading,
      body: kept.join(" ").trim(),
    };
  });

  return {
    sections: next.filter((s) => s.body.length > 0 || s.heading.length > 0),
    dropped,
    warnings,
  };
}

function enrichP2P(
  raw: Analysis["p2p"],
  evidence: ValidatedEvidence[],
  verdict: Analysis["verdict"],
): Analysis["p2p"] {
  const chartPoints = evidence.map(
    (e) => `Chart (${e.note_id}): "${e.quote}"`,
  );

  let talking = [...raw.talking_points];
  // Ensure every validated quote surfaces as a talk track
  for (const point of chartPoints) {
    const quoteCore = point.slice(point.indexOf('"') + 1, point.lastIndexOf('"'));
    const already = talking.some(
      (t) => quoteCore.length > 20 && t.includes(quoteCore.slice(0, 40)),
    );
    if (!already) talking.push(point);
  }
  if (talking.length === 0 && chartPoints.length) {
    talking = chartPoints;
  }

  if (verdict === "uphold_denial") {
    return {
      opening:
        raw.opening.includes("query") || raw.opening.includes("attending")
          ? raw.opening
          : `Internal huddle only — documentation appears insufficient to overturn. Query the attending before any write-off or external peer-to-peer. ${raw.opening}`.trim(),
      talking_points: [
        "This is a documentation-gap review, not an automatic write-off.",
        "Ask the attending whether red flags, conservative care, or criteria were documented elsewhere.",
        ...talking,
      ],
      likely_pushback: raw.likely_pushback.length
        ? raw.likely_pushback.map((p) => ({
            objection: p.objection,
            response: p.response.includes("write-off")
              ? p.response
              : `${p.response} If chart is incomplete, reopen — do not treat this as final.`,
          }))
        : [
            {
              objection: "Billing wants to write this off now.",
              response:
                "Pause. Query the attending for omitted documentation first; only then decide appeal vs acceptance.",
            },
          ],
      ask:
        raw.ask.toLowerCase().includes("query") ||
        raw.ask.toLowerCase().includes("attending")
          ? raw.ask
          : "Query the attending for missing documentation before peer-to-peer or write-off.",
    };
  }

  return {
    opening: raw.opening,
    talking_points: talking,
    likely_pushback: raw.likely_pushback,
    ask: raw.ask,
  };
}

export function validateAnalysis(
  raw: Analysis,
  notes: NoteSource[],
  policy: PolicySource,
  allowedPolicyCodes: string[],
  options: ValidateOptions | string[] = {},
): ValidationResult {
  // Back-compat: older callers passed extraCitationAllow as 5th arg array
  const opts: ValidateOptions = Array.isArray(options)
    ? { extraCitationAllow: options }
    : options;
  const extraCitationAllow = opts.extraCitationAllow ?? [];
  const planType = opts.planType ?? "unknown";
  const claimFacts = opts.claimFacts ?? {};

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

  const { kept: policyOnlyCitations, dropped: droppedCitations } =
    filterCitations(
      raw.letter.citations,
      allowedPolicyCodes,
      extraCitationAllow,
    );

  if (droppedCitations.some(isRegulationCode)) {
    // Soft hint — not a retry failure; we attach the right ones ourselves
  } else if (droppedCitations.length) {
    retryHints.push(
      `Dropped unknown citations: ${droppedCitations.join(", ")}. Use only Allowed Citations (policy codes).`,
    );
  }

  const citations = attachPlanCitations(policyOnlyCitations, planType);

  let verdict = raw.verdict;
  // Force weak if appeal with zero valid evidence, or nothing valid survives
  if (verdict === "appeal" && validEvidence.length === 0) {
    verdict = "weak";
  }
  if (validEvidence.length === 0 && !policyClauseValid) {
    verdict = "weak";
  }

  const groundingTexts = [
    ...validEvidence.map((e) => e.quote),
    policyClause?.quote ?? "",
    policy.policy_code,
    ...(claimFacts.cpt_codes ?? []).map((c) => `CPT ${c}`),
    ...(claimFacts.cpt_codes ?? []),
    claimFacts.carc_code ?? "",
    claimFacts.patient_alias ?? "",
    claimFacts.id ?? "",
    claimFacts.denial_reason ?? "",
    ...allowedPolicyCodes,
    ...policyOnlyCitations,
  ];

  const scrubbed = scrubLetterProvenance(raw.letter.sections, groundingTexts);
  if (scrubbed.dropped.length) {
    retryHints.push(
      `Letter asserted clinical facts not in validated evidence: ${scrubbed.dropped.length} sentence(s) removed. Only state facts present in evidence quotes.`,
    );
  }

  const p2p = enrichP2P(raw.p2p, validEvidence, verdict);

  // Soften uphold gaps copy when model used write-off language
  let gaps = [...raw.gaps];
  if (verdict === "uphold_denial") {
    const softGap =
      "Documentation gap — query the attending before write-off or external appeal. This is not an automatic abandon.";
    if (!gaps.some((g) => /query|attending|documentation gap/i.test(g))) {
      gaps = [softGap, ...gaps];
    }
  }

  const needsRetry =
    retryHints.length > 0 &&
    (droppedEvidence.length > 0 || !policyClauseValid || scrubbed.dropped.length > 0);

  const analysis: ValidatedAnalysis = {
    ...raw,
    verdict,
    gaps,
    policy_clause: policyClause,
    evidence: validEvidence,
    letter: {
      sections: scrubbed.sections,
      citations,
    },
    p2p,
    letter_warnings: scrubbed.warnings,
  };

  return {
    analysis,
    droppedEvidence,
    policyClauseValid,
    droppedCitations,
    droppedLetterSentences: scrubbed.dropped,
    needsRetry,
    retryHints,
  };
}
