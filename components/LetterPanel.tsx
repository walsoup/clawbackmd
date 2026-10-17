"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { DraftBanner } from "./DraftBanner";
import { EmptyState } from "./ui";
import { useToast } from "./Toast";
import type { ValidatedAnalysis } from "@/lib/schemas";

type Section = { heading: string; body: string };

export function LetterPanel({
  analysis,
  isCached,
  claimId,
}: {
  analysis: ValidatedAnalysis | null;
  isCached?: boolean;
  claimId?: string;
}) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [signedBy, setSignedBy] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);

  const storageKey = claimId ? `clawbackmd-letter:${claimId}` : null;

  useEffect(() => {
    if (!analysis) {
      setSections([]);
      setSignedBy("");
      setSignedAt(null);
      return;
    }
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            sections: Section[];
            signedBy?: string;
            signedAt?: string | null;
          };
          if (parsed.sections?.length) {
            setSections(parsed.sections);
            setSignedBy(parsed.signedBy ?? "");
            setSignedAt(parsed.signedAt ?? null);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }
    setSections(analysis.letter.sections.map((s) => ({ ...s })));
    setSignedBy("");
    setSignedAt(null);
  }, [analysis, storageKey]);

  const plain = useMemo(
    () =>
      sections
        .map((s) => `${s.heading}\n\n${s.body}`)
        .join("\n\n")
        .concat(
          analysis?.letter.citations.length
            ? `\n\nCitations: ${analysis.letter.citations.join("; ")}`
            : "",
        )
        .concat(
          signedAt && signedBy
            ? `\n\nReviewed / signed: ${signedBy} (${signedAt})`
            : "",
        ),
    [sections, analysis, signedAt, signedBy],
  );

  function persist(next: {
    sections: Section[];
    signedBy: string;
    signedAt: string | null;
  }) {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function updateSection(i: number, patch: Partial<Section>) {
    setSections((prev) => {
      const next = prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      persist({ sections: next, signedBy, signedAt: null });
      return next;
    });
    setSignedAt(null);
  }

  function signOff() {
    const name = signedBy.trim();
    if (!name) {
      toast("Enter reviewer name before signing off", "warn");
      return;
    }
    const at = new Date().toISOString();
    setSignedAt(at);
    persist({ sections, signedBy: name, signedAt: at });
    toast(`Signed off by ${name}`);
  }

  if (!analysis) {
    return <EmptyState text="No letter yet." />;
  }

  if (analysis.verdict === "uphold_denial") {
    return (
      <div className="flex h-full flex-col">
        <DraftBanner />
        <div className="flex flex-1 flex-col justify-center px-1 py-8">
          <p className="ln-title text-[var(--ln-rec)]">
            No appeal letter recommended
          </p>
          <p className="ln-body-sec mt-2 text-[var(--ln-text-secondary)]">
            Denial appears valid. See evidence and gaps for the rationale.
          </p>
          {analysis.letter.sections[0] && (
            <p className="ln-body mt-5 text-[var(--ln-text)]">
              {analysis.letter.sections[0].body}
            </p>
          )}
        </div>
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(plain);
      toast("Letter copied");
    } catch {
      toast("Copy failed", "error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DraftBanner />
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="ln-label text-[var(--ln-text)]">Appeal letter</span>
          {isCached && (
            <span className="ln-caption rounded-[var(--ln-pill-radius)] bg-[var(--ln-container-low)] px-2 py-0.5 text-[var(--ln-muted)]">
              Cached
            </span>
          )}
          {signedAt && (
            <span className="ln-caption rounded-[var(--ln-pill-radius)] bg-[var(--ln-container)] px-2 py-0.5 text-[var(--ln-primary)]">
              Signed
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="ln-btn ln-btn-ghost ln-btn-sm">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="ln-btn ln-btn-tonal ln-btn-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      <div className="print-letter flex-1 overflow-y-auto pb-6">
        {sections.map((s, i) => (
          <section key={i} className="mb-5">
            <input
              className="ln-title mb-2 w-full border-0 bg-transparent text-[var(--ln-text)] outline-none print:text-black focus:bg-[var(--ln-container-low)] rounded-[var(--ln-pill-radius)] px-1"
              value={s.heading}
              onChange={(e) => updateSection(i, { heading: e.target.value })}
              aria-label={`Section ${i + 1} heading`}
            />
            <textarea
              className="ln-body w-full resize-y whitespace-pre-wrap rounded-[var(--ln-pill-radius)] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] px-3 py-2 text-[var(--ln-text-secondary)] outline-none focus:border-[var(--ln-primary)] print:border-0 print:bg-transparent print:p-0 print:text-black"
              rows={Math.max(4, Math.ceil(s.body.length / 70))}
              value={s.body}
              onChange={(e) => updateSection(i, { body: e.target.value })}
              aria-label={`Section ${i + 1} body`}
            />
          </section>
        ))}
        {analysis.letter.citations.length > 0 && (
          <p className="ln-caption mt-2 border-t border-[var(--ln-hairline)] pt-3 text-[var(--ln-muted)]">
            Citations: {analysis.letter.citations.join("; ")}
          </p>
        )}

        <div className="mt-6 space-y-2 border-t border-[var(--ln-hairline)] pt-4 print:hidden">
          <p className="ln-overline">Physician / billing sign-off</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="ln-field mt-0 max-w-xs"
              placeholder="Reviewer name"
              value={signedBy}
              onChange={(e) => {
                setSignedBy(e.target.value);
                setSignedAt(null);
              }}
            />
            <button type="button" onClick={signOff} className="ln-btn ln-btn-primary ln-btn-sm">
              <Check className="h-3.5 w-3.5" /> Approve &amp; sign
            </button>
          </div>
          {signedAt && (
            <p className="ln-caption text-[var(--ln-primary)]">
              Signed by {signedBy} · {new Date(signedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
