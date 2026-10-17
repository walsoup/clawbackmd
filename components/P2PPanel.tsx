"use client";

import { DraftBanner } from "./DraftBanner";
import { EmptyState, SectionTitle } from "./ui";
import type { ValidatedAnalysis } from "@/lib/schemas";

export function P2PPanel({
  analysis,
  isCached,
}: {
  analysis: ValidatedAnalysis | null;
  isCached?: boolean;
}) {
  if (!analysis) {
    return <EmptyState text="No peer-to-peer notes yet." />;
  }

  const p2p = analysis.p2p;

  return (
    <div className="flex h-full flex-col">
      <DraftBanner />
      <div className="flex items-center gap-2 py-3">
        <span className="ln-label text-[var(--ln-text)]">
          Peer-to-peer notes
        </span>
        {isCached && (
          <span className="ln-caption rounded-[var(--ln-pill-radius)] bg-[var(--ln-container-low)] px-2 py-0.5 text-[var(--ln-muted)]">
            Cached
          </span>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pb-6">
        <SectionTitle>Opening</SectionTitle>
        <p className="ln-body text-[var(--ln-text)]">{p2p.opening}</p>

        <SectionTitle>Talking points</SectionTitle>
        <ul className="list-disc space-y-1.5 pl-5 ln-body text-[var(--ln-text)]">
          {p2p.talking_points.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>

        <SectionTitle>Likely pushback</SectionTitle>
        <div className="space-y-4">
          {p2p.likely_pushback.map((p, i) => (
            <div key={i} className="border-b border-[var(--ln-hairline)] pb-4 last:border-0">
              <p className="ln-body text-[var(--ln-text)]">
                <span className="font-semibold">Objection. </span>
                {p.objection}
              </p>
              <p className="ln-body-sec mt-1.5 text-[var(--ln-primary)]">
                <span className="font-semibold">Response. </span>
                {p.response}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[var(--ln-pill-radius)] bg-[var(--ln-container)] px-4 py-3">
          <p className="ln-overline text-[var(--ln-primary)]">The ask</p>
          <p className="ln-body mt-1 text-[var(--ln-text)]">{p2p.ask}</p>
        </div>
      </div>
    </div>
  );
}
