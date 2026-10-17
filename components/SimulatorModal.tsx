"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { EvidenceMatrix } from "./EvidenceMatrix";
import { LetterPanel } from "./LetterPanel";
import { P2PPanel } from "./P2PPanel";
import { Hairline, TextTabs } from "./ui";
import { useToast } from "./Toast";
import type { ValidatedAnalysis } from "@/lib/schemas";

const TEMPLATES = [
  {
    id: "red-flag",
    label: "Red-flag imaging",
    payer: "Example Payer – AutoReview",
    carc: "CO-50",
    denialReason:
      "Conservative headache management not attempted prior to advanced imaging.",
    policyCode: "NEURO-09",
    policyText:
      "MRI brain is covered for headache only after 4 weeks of conservative care, unless a red-flag exception applies. Thunderclap onset or new cranial nerve palsy warrants urgent neuroimaging without a prior conservative trial.",
    clinicalNote:
      "ED note: sudden-onset maximal headache peaking within seconds (thunderclap onset). Exam shows acute right cranial nerve III palsy with ptosis and a dilated pupil. Urgent MRI brain ordered.",
  },
  {
    id: "valid-denial",
    label: "Likely uphold",
    payer: "Example Payer – ClaimSense",
    carc: "CO-50",
    denialReason:
      "Lumbar MRI without 6 weeks of conservative care and without red flags.",
    policyCode: "SPINE-04",
    policyText:
      "Lumbar MRI requires 6 weeks of documented conservative care absent red flags. Nine days of nonspecific low back pain with a normal neurologic examination does not meet medical necessity.",
    clinicalNote:
      "Office visit: 9 days of low back pain after lifting. Strength 5/5, reflexes symmetric, negative SLR. No red flags identified. MRI ordered same day.",
  },
] as const;

export function SimulatorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [payer, setPayer] = useState("Example Payer – AutoReview");
  const [carc, setCarc] = useState("CO-50");
  const [denialReason, setDenialReason] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");
  const [policyCode, setPolicyCode] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    analysis: ValidatedAnalysis;
    policy: { policy_code: string; body: string };
    note: { id: string; text: string; authored_at: string };
    denial_reason: string;
  } | null>(null);
  const [tab, setTab] = useState("Letter");

  if (!open) return null;

  function loadTemplate(id: (typeof TEMPLATES)[number]["id"]) {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setPayer(t.payer);
    setCarc(t.carc);
    setDenialReason(t.denialReason);
    setClinicalNote(t.clinicalNote);
    setPolicyCode(t.policyCode);
    setPolicyText(t.policyText);
    setResult(null);
  }

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer,
          carc,
          denialReason,
          clinicalNote,
          policyCode: policyCode || undefined,
          policyText: policyText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");
      setResult({
        analysis: data.analysis,
        policy: data.policy,
        note: data.note,
        denial_reason: data.denial_reason,
      });
      if (data.fallback) {
        toast(
          "Model offline — showing offline draft stub (weak). Start Ollama to regenerate.",
          "warn",
        );
      } else {
        toast(`Analysis complete — ${data.analysis.verdict}`);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[var(--ln-scrim)] p-4 print:hidden">
      <div className="my-6 w-full max-w-5xl rounded-[var(--ln-dialog-radius)] bg-[var(--ln-bg)] shadow-none">
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="ln-title text-[var(--ln-text)]">
            Analyze a custom denial
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ln-container-low)] text-[var(--ln-text)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 pt-2 pb-1">
          <p className="ln-body-sec text-[var(--ln-text-secondary)]">
            Paste a denial and a clinical note, or load a template. Same
            guardrails as seeded claims. Offline fallback if the model is down.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadTemplate(t.id)}
                className="ln-btn ln-btn-tonal ln-btn-sm"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Hairline className="mt-4" />

        <div className="grid gap-8 p-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Payer">
              <input value={payer} onChange={(e) => setPayer(e.target.value)} className="ln-field" />
            </Field>
            <Field label="CARC">
              <input value={carc} onChange={(e) => setCarc(e.target.value)} className="ln-field" />
            </Field>
            <Field label="Denial reason">
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                rows={3}
                className="ln-field"
                placeholder="Insurer’s denial language…"
              />
            </Field>
            <Field label="Clinical note">
              <textarea
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                rows={6}
                className="ln-field"
                placeholder="Synthetic clinical note…"
              />
            </Field>
            <Field label="Policy code (optional)">
              <input
                value={policyCode}
                onChange={(e) => setPolicyCode(e.target.value)}
                className="ln-field"
                placeholder="e.g. ORTHO-112"
              />
            </Field>
            <Field label="Policy text (optional)">
              <textarea
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                rows={3}
                className="ln-field"
                placeholder="Leave blank for a generic stub…"
              />
            </Field>
            <button
              type="button"
              onClick={run}
              disabled={loading || !denialReason.trim() || !clinicalNote.trim()}
              className="ln-btn ln-btn-primary w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Run analysis
            </button>
          </div>

          <div className="min-h-[360px] rounded-[var(--ln-card-radius)] border border-[var(--ln-hairline)] bg-[var(--ln-surface)] p-4">
            {!result ? (
              <p className="ln-body-sec flex h-full items-center justify-center text-[var(--ln-muted)]">
                Results appear here after analysis.
              </p>
            ) : (
              <div className="flex max-h-[70vh] flex-col">
                <div className="max-h-[45%] overflow-y-auto">
                  <EvidenceMatrix
                    denialReason={result.denial_reason}
                    policy={result.policy}
                    notes={[result.note]}
                    analysis={result.analysis}
                  />
                </div>
                <TextTabs
                  tabs={["Letter", "Peer-to-peer"]}
                  selected={tab}
                  onSelect={setTab}
                />
                <div className="min-h-0 flex-1 overflow-y-auto pt-2">
                  {tab === "Letter" ? (
                    <LetterPanel analysis={result.analysis} claimId="SIM" />
                  ) : (
                    <P2PPanel analysis={result.analysis} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block ln-caption text-[var(--ln-text-secondary)]">
      {label}
      {children}
    </label>
  );
}
