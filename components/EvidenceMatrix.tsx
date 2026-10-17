"use client";

import { HighlightedText } from "./HighlightedText";
import { EmptyState, FactRow, SectionTitle } from "./ui";
import type { ValidatedAnalysis } from "@/lib/schemas";

type Policy = { policy_code: string; title?: string; body: string };
type Note = { id: string; text: string; authored_at: string; note_type?: string };

export function EvidenceMatrix({
  denialReason,
  policy,
  notes,
  analysis,
  isCached,
}: {
  denialReason: string;
  policy: Policy | null;
  notes: Note[];
  analysis: ValidatedAnalysis | null;
  isCached?: boolean;
}) {
  if (!analysis) {
    return (
      <EmptyState text="Select a claim and generate a draft to see evidence." />
    );
  }

  const uphold = analysis.verdict === "uphold_denial";
  const noteById = new Map(notes.map((n) => [n.id, n]));
  const rangesByNote = new Map<string, Array<{ start: number; end: number }>>();
  for (const ev of analysis.evidence) {
    const list = rangesByNote.get(ev.note_id) ?? [];
    list.push({ start: ev.start, end: ev.end });
    rangesByNote.set(ev.note_id, list);
  }
  const citedNotes = [...rangesByNote.keys()]
    .map((id) => noteById.get(id))
    .filter(Boolean) as Note[];

  return (
    <div className="space-y-1 pb-8">
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <VerdictChip verdict={analysis.verdict} confidence={analysis.confidence} />
        {isCached && (
          <span className="ln-caption rounded-[var(--ln-pill-radius)] bg-[var(--ln-container-low)] px-2 py-0.5 text-[var(--ln-muted)]">
            Cached
          </span>
        )}
      </div>

      {uphold && (
        <div className="mt-3 rounded-[var(--ln-pill-radius)] bg-[var(--ln-rec-soft)] px-3 py-2.5 ln-body-sec text-[var(--ln-rec)]">
          Documentation gap — query the attending before write-off. Chart does
          not currently meet the cited policy requirement; this is not an
          automatic abandon.
        </div>
      )}

      <SectionTitle>Insurer reason</SectionTitle>
      <p className="ln-body text-[var(--ln-text)]">
        {analysis.denial_reason || denialReason}
      </p>

      <SectionTitle>Policy clause</SectionTitle>
      {policy && analysis.policy_clause ? (
        <div>
          <p className="ln-mono-tiny mb-2 text-[var(--ln-primary)]">
            {analysis.policy_clause.policy_code}
            {policy.title ? ` — ${policy.title}` : ""}
          </p>
          <p className="ln-body-sec text-[var(--ln-text-secondary)]">
            <HighlightedText
              text={policy.body}
              ranges={[
                {
                  start: analysis.policy_clause.start,
                  end: analysis.policy_clause.end,
                },
              ]}
            />
          </p>
        </div>
      ) : (
        <p className="ln-body-sec text-[var(--ln-muted)]">
          No validated policy quote.
        </p>
      )}

      <SectionTitle>Chart evidence</SectionTitle>
      {citedNotes.length === 0 ? (
        <p className="ln-body-sec text-[var(--ln-muted)]">No validated quotes.</p>
      ) : (
        <div className="space-y-5">
          {citedNotes.map((n) => (
            <div key={n.id}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="ln-mono-tiny text-[var(--ln-primary)]">{n.id}</span>
                <span className="ln-caption text-[var(--ln-muted)]">
                  {new Date(n.authored_at).toLocaleString()}
                </span>
                {n.note_type && (
                  <span className="ln-caption text-[var(--ln-muted)]">
                    {n.note_type}
                  </span>
                )}
              </div>
              <p className="ln-body-sec text-[var(--ln-text-secondary)]">
                <HighlightedText
                  text={n.text}
                  ranges={rangesByNote.get(n.id) ?? []}
                />
              </p>
            </div>
          ))}
        </div>
      )}

      {analysis.gaps.length > 0 && (
        <>
          <SectionTitle>Gaps</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 ln-body-sec text-[var(--ln-rec)]">
            {analysis.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </>
      )}

      {policy && (
        <>
          <SectionTitle>Claim facts</SectionTitle>
          <FactRow label="Policy" value={policy.policy_code} />
          <FactRow label="Evidence quotes" value={String(analysis.evidence.length)} last />
        </>
      )}
    </div>
  );
}

function VerdictChip({
  verdict,
  confidence,
}: {
  verdict: string;
  confidence: number;
}) {
  const label =
    verdict === "uphold_denial"
      ? "Query attending"
      : verdict === "appeal"
        ? "Appeal"
        : "Weak";

  const tone =
    verdict === "appeal"
      ? "bg-[var(--ln-container)] text-[var(--ln-primary)]"
      : verdict === "uphold_denial"
        ? "bg-[var(--ln-rec-soft)] text-[var(--ln-rec)]"
        : "bg-[var(--ln-container-low)] text-[var(--ln-text-secondary)]";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[var(--ln-pill-radius)] px-2.5 py-1 ln-label ${tone}`}
    >
      {label}
      <span className="ln-mono-tiny opacity-80">
        {(confidence * 100).toFixed(0)}%
      </span>
    </span>
  );
}
