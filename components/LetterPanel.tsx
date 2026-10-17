"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { DraftBanner } from "./DraftBanner";
import { EmptyState } from "./ui";
import { useToast } from "./Toast";
import type { ValidatedAnalysis } from "@/lib/schemas";

type Section = { heading: string; body: string };

type SignOffState = {
  sections: Section[];
  clinicalName: string;
  billingName: string;
  clinicalAck: boolean;
  billingAck: boolean;
  clinicalAt: string | null;
  billingAt: string | null;
};

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
  const [clinicalName, setClinicalName] = useState("");
  const [billingName, setBillingName] = useState("");
  const [clinicalAck, setClinicalAck] = useState(false);
  const [billingAck, setBillingAck] = useState(false);
  const [clinicalAt, setClinicalAt] = useState<string | null>(null);
  const [billingAt, setBillingAt] = useState<string | null>(null);

  const storageKey = claimId ? `clawbackmd-letter:${claimId}` : null;
  const dualSigned = Boolean(clinicalAt && billingAt);
  const warnings = analysis?.letter_warnings ?? [];

  useEffect(() => {
    if (!analysis) {
      setSections([]);
      setClinicalName("");
      setBillingName("");
      setClinicalAck(false);
      setBillingAck(false);
      setClinicalAt(null);
      setBillingAt(null);
      return;
    }
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as SignOffState & {
            signedBy?: string;
            signedAt?: string | null;
          };
          if (parsed.sections?.length) {
            setSections(parsed.sections);
            // Migrate old single-signer shape
            if (parsed.clinicalName !== undefined) {
              setClinicalName(parsed.clinicalName ?? "");
              setBillingName(parsed.billingName ?? "");
              setClinicalAck(Boolean(parsed.clinicalAck));
              setBillingAck(Boolean(parsed.billingAck));
              setClinicalAt(parsed.clinicalAt ?? null);
              setBillingAt(parsed.billingAt ?? null);
            } else if (parsed.signedBy) {
              setClinicalName(parsed.signedBy);
              setBillingName("");
              setClinicalAck(false);
              setBillingAck(false);
              setClinicalAt(null);
              setBillingAt(null);
            }
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }
    setSections(analysis.letter.sections.map((s) => ({ ...s })));
    setClinicalName("");
    setBillingName("");
    setClinicalAck(false);
    setBillingAck(false);
    setClinicalAt(null);
    setBillingAt(null);
  }, [analysis, storageKey]);

  const plain = useMemo(() => {
    const status = dualSigned
      ? `\n\nDemo dual review logged — clinical: ${clinicalName} (${clinicalAt}); billing: ${billingName} (${billingAt}). Not an e-signature / not NPI-bound.`
      : "\n\nUNSIGNED DRAFT — clinical and billing review required before send.";
    return sections
      .map((s) => `${s.heading}\n\n${s.body}`)
      .join("\n\n")
      .concat(
        analysis?.letter.citations.length
          ? `\n\nCitations: ${analysis.letter.citations.join("; ")}`
          : "",
      )
      .concat(status);
  }, [
    sections,
    analysis,
    dualSigned,
    clinicalName,
    billingName,
    clinicalAt,
    billingAt,
  ]);

  function persist(next: SignOffState) {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function snapshot(partial: Partial<SignOffState> = {}): SignOffState {
    return {
      sections,
      clinicalName,
      billingName,
      clinicalAck,
      billingAck,
      clinicalAt,
      billingAt,
      ...partial,
    };
  }

  function clearSignatures(nextSections: Section[]) {
    setClinicalAt(null);
    setBillingAt(null);
    setClinicalAck(false);
    setBillingAck(false);
    persist(
      snapshot({
        sections: nextSections,
        clinicalAt: null,
        billingAt: null,
        clinicalAck: false,
        billingAck: false,
      }),
    );
  }

  function updateSection(i: number, patch: Partial<Section>) {
    setSections((prev) => {
      const next = prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      clearSignatures(next);
      return next;
    });
  }

  function signClinical() {
    const name = clinicalName.trim();
    if (!name) {
      toast("Enter clinical reviewer name", "warn");
      return;
    }
    if (!clinicalAck) {
      toast("Confirm chart-vs-letter attestation first", "warn");
      return;
    }
    const at = new Date().toISOString();
    setClinicalAt(at);
    persist(snapshot({ clinicalName: name, clinicalAck: true, clinicalAt: at }));
    toast(`Clinical review logged: ${name}`);
  }

  function signBilling() {
    const name = billingName.trim();
    if (!name) {
      toast("Enter billing reviewer name", "warn");
      return;
    }
    if (!billingAck) {
      toast("Confirm codes/amount attestation first", "warn");
      return;
    }
    const at = new Date().toISOString();
    setBillingAt(at);
    persist(snapshot({ billingName: name, billingAck: true, billingAt: at }));
    toast(`Billing review logged: ${name}`);
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
            Documentation gap — query attending
          </p>
          <p className="ln-body-sec mt-2 text-[var(--ln-text-secondary)]">
            Chart does not currently support overturn. This is not an automatic
            write-off — ask the attending whether criteria or red flags were
            documented elsewhere.
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
      toast(
        dualSigned
          ? "Letter copied (dual review logged — demo only)"
          : "Unsigned draft copied — do not send",
        dualSigned ? "info" : "warn",
      );
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
          {dualSigned ? (
            <span className="ln-caption rounded-[var(--ln-pill-radius)] bg-[var(--ln-container)] px-2 py-0.5 text-[var(--ln-primary)]">
              Dual review logged
            </span>
          ) : (
            <span className="ln-caption rounded-[var(--ln-pill-radius)] bg-[var(--ln-rec-soft)] px-2 py-0.5 text-[var(--ln-rec)]">
              Unsigned draft
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="ln-btn ln-btn-ghost ln-btn-sm">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            type="button"
            onClick={() => {
              if (!dualSigned) {
                toast("Print allowed, but dual review not logged yet", "warn");
              }
              window.print();
            }}
            className="ln-btn ln-btn-tonal ln-btn-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mb-3 rounded-[var(--ln-pill-radius)] bg-[var(--ln-rec-soft)] px-3 py-2 print:hidden">
          <p className="ln-overline text-[var(--ln-rec)]">Letter provenance</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 ln-caption text-[var(--ln-rec)]">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

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
            <span className="block mt-1">
              Policy codes from draft; CFR (if any) attached by plan type — not
              LLM-invented.
            </span>
          </p>
        )}

        <div className="mt-6 space-y-4 border-t border-[var(--ln-hairline)] pt-4 print:hidden">
          <div>
            <p className="ln-overline">Dual review (demo log only)</p>
            <p className="ln-caption mt-1 text-[var(--ln-muted)]">
              Browser-local review log — not an e-signature, not NPI-bound, not
              legal attestation. Edits clear both reviews.
            </p>
          </div>

          <div className="space-y-2 rounded-[var(--ln-pill-radius)] border border-[var(--ln-hairline)] p-3">
            <p className="ln-label text-[var(--ln-text)]">Clinical reviewer</p>
            <label className="flex items-start gap-2 ln-caption text-[var(--ln-text-secondary)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={clinicalAck}
                disabled={Boolean(clinicalAt)}
                onChange={(e) => {
                  setClinicalAck(e.target.checked);
                  setClinicalAt(null);
                }}
              />
              I confirm letter clinical claims match validated chart quotes.
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                className="ln-field mt-0 max-w-xs"
                placeholder="Clinical reviewer name"
                value={clinicalName}
                disabled={Boolean(clinicalAt)}
                onChange={(e) => {
                  setClinicalName(e.target.value);
                  setClinicalAt(null);
                }}
              />
              <button
                type="button"
                onClick={signClinical}
                disabled={Boolean(clinicalAt)}
                className="ln-btn ln-btn-primary ln-btn-sm"
              >
                <Check className="h-3.5 w-3.5" /> Log clinical review
              </button>
            </div>
            {clinicalAt && (
              <p className="ln-caption text-[var(--ln-primary)]">
                Clinical: {clinicalName} · {new Date(clinicalAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-[var(--ln-pill-radius)] border border-[var(--ln-hairline)] p-3">
            <p className="ln-label text-[var(--ln-text)]">Billing reviewer</p>
            <label className="flex items-start gap-2 ln-caption text-[var(--ln-text-secondary)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={billingAck}
                disabled={Boolean(billingAt)}
                onChange={(e) => {
                  setBillingAck(e.target.checked);
                  setBillingAt(null);
                }}
              />
              I confirm CPT / denial codes and amounts match the remittance.
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                className="ln-field mt-0 max-w-xs"
                placeholder="Billing reviewer name"
                value={billingName}
                disabled={Boolean(billingAt)}
                onChange={(e) => {
                  setBillingName(e.target.value);
                  setBillingAt(null);
                }}
              />
              <button
                type="button"
                onClick={signBilling}
                disabled={Boolean(billingAt)}
                className="ln-btn ln-btn-primary ln-btn-sm"
              >
                <Check className="h-3.5 w-3.5" /> Log billing review
              </button>
            </div>
            {billingAt && (
              <p className="ln-caption text-[var(--ln-primary)]">
                Billing: {billingName} · {new Date(billingAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
