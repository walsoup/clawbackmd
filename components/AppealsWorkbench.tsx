"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { ClaimsQueue, type ClaimListItem } from "./ClaimsQueue";
import { EvidenceMatrix } from "./EvidenceMatrix";
import { LetterPanel } from "./LetterPanel";
import { P2PPanel } from "./P2PPanel";
import { KpiBar } from "./KpiBar";
import { SimulatorModal } from "./SimulatorModal";
import { ToastProvider, useToast } from "./Toast";
import { PageHeader, TextTabs } from "./ui";
import type { KpiPayload } from "@/lib/kpis";
import type { ValidatedAnalysis } from "@/lib/schemas";

type FullClaim = ClaimListItem & {
  denial_reason: string;
  policy: {
    id: string;
    policy_code: string;
    title: string;
    body: string;
  } | null;
  notes: Array<{
    id: string;
    text: string;
    authored_at: string;
    note_type: string;
  }>;
  activeAppeal: {
    id: string;
    model: string;
    latency_ms: number;
    created_at: string;
    is_cached: boolean;
    analysis: ValidatedAnalysis;
  } | null;
};

function todayOverline() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function WorkbenchInner() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<FullClaim[]>([]);
  const [kpis, setKpis] = useState<KpiPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState("Evidence");
  const [simOpen, setSimOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [cRes, kRes] = await Promise.all([
      fetch("/api/claims"),
      fetch("/api/kpis"),
    ]);
    const cData = await cRes.json();
    const kData = await kRes.json();
    if (!cRes.ok) throw new Error(cData.error ?? "Failed to load claims");
    if (!kRes.ok) throw new Error(kData.error ?? "Failed to load KPIs");
    setClaims(cData.claims);
    setKpis(kData);
    setSelectedId((prev) => {
      if (prev && cData.claims.some((c: FullClaim) => c.id === prev)) return prev;
      return cData.claims[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [refresh, toast]);

  const selected = useMemo(
    () => claims.find((c) => c.id === selectedId) ?? null,
    [claims, selectedId],
  );

  async function onSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      toast(`Demo data reloaded (${data.counts.claims} claims)`);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSeeding(false);
    }
  }

  async function onAnalyze() {
    if (!selected) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");

      if (data.fallback) {
        toast(
          `Model unavailable — showing cached draft (${new Date(data.appeal.created_at).toLocaleDateString()}, ${data.appeal.model})`,
          "warn",
        );
      } else {
        toast(
          `Draft ready in ${data.appeal.latency_ms} ms — ${data.appeal.analysis.verdict}`,
        );
      }
      setTab("Letter");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setAnalyzing(false);
    }
  }

  const lede = kpis
    ? `${kpis.totalDeniedCount} denials · $${kpis.totalDeniedAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} at risk`
    : "Synthetic demo · drafts only";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ln-bg)] text-[var(--ln-text)]">
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-[var(--ln-screen-margin)] pb-10">
        <PageHeader
          overline={todayOverline()}
          title="ClawbackMD"
          lede={lede}
          actions={
            <button
              type="button"
              onClick={() => setSimOpen(true)}
              className="ln-btn ln-btn-ghost ln-btn-sm"
            >
              Custom denial
            </button>
          }
        />

        <KpiBar kpis={kpis} />

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--ln-muted)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-0 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4 lg:max-h-[calc(100vh-14rem)] lg:overflow-hidden">
              <ClaimsQueue
                claims={claims}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setTab("Evidence");
                }}
                onSeed={onSeed}
                seeding={seeding}
              />
            </div>

            <div className="mt-8 border-t border-[var(--ln-hairline)] pt-6 lg:col-span-8 lg:mt-0 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l lg:border-[var(--ln-hairline)] lg:pl-10 lg:pt-0">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="ln-overline">
                        {selected.id} · {selected.patient_alias}
                      </p>
                      <h2 className="ln-headline mt-1.5 text-[var(--ln-text)]">
                        {selected.carc_code} denial
                      </h2>
                      <p className="ln-body-sec mt-1 text-[var(--ln-text-secondary)]">
                        {selected.payer_name} · CPT{" "}
                        {selected.cpt_codes.join(", ")} · $
                        {selected.billed_amount.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onAnalyze}
                      disabled={analyzing}
                      className="ln-btn ln-btn-primary"
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : selected.activeAppeal ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {selected.activeAppeal
                        ? "Regenerate draft"
                        : "Generate draft"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <TextTabs
                      tabs={["Evidence", "Letter", "Peer-to-peer"]}
                      selected={tab}
                      onSelect={setTab}
                    />
                    <div className="min-h-[320px] pt-2">
                      {tab === "Evidence" && (
                        <EvidenceMatrix
                          denialReason={selected.denial_reason}
                          policy={selected.policy}
                          notes={selected.notes}
                          analysis={selected.activeAppeal?.analysis ?? null}
                          isCached={selected.activeAppeal?.is_cached}
                        />
                      )}
                      {tab === "Letter" && (
                        <LetterPanel
                          analysis={selected.activeAppeal?.analysis ?? null}
                          isCached={selected.activeAppeal?.is_cached}
                          claimId={selected.id}
                        />
                      )}
                      {tab === "Peer-to-peer" && (
                        <P2PPanel
                          analysis={selected.activeAppeal?.analysis ?? null}
                          isCached={selected.activeAppeal?.is_cached}
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="ln-body-sec py-16 text-center text-[var(--ln-muted)]">
                  Select a claim from the list.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-[var(--ln-hairline)] px-[var(--ln-screen-margin)] py-3 text-center ln-caption text-[var(--ln-muted)]">
        All payers, patients, and claims are fictional. Drafts require physician
        and billing review — not medical or legal advice.
      </footer>

      <SimulatorModal open={simOpen} onClose={() => setSimOpen(false)} />
    </div>
  );
}

export function AppealsWorkbench() {
  return (
    <ToastProvider>
      <WorkbenchInner />
    </ToastProvider>
  );
}

/** @deprecated use AppealsWorkbench */
export const WarRoom = AppealsWorkbench;
