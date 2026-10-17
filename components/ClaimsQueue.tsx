"use client";

import { Loader2 } from "lucide-react";
import { GroupLabel, EmptyState } from "./ui";

export type ClaimListItem = {
  id: string;
  patient_alias: string;
  cpt_codes: string[];
  billed_amount: number;
  payer_name: string;
  carc_code: string;
  status: string;
  denial_reason: string;
};

const STATUS_LABEL: Record<string, string> = {
  denied: "Denied",
  analyzed: "Reviewed",
  appeal_ready: "Appeal ready",
  uphold: "Query attending",
};

function padIndex(i: number) {
  return String(i + 1).padStart(2, "0");
}

export function ClaimsQueue({
  claims,
  selectedId,
  onSelect,
  onSeed,
  seeding,
}: {
  claims: ClaimListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 pb-1">
        <GroupLabel>Denied claims</GroupLabel>
        <button
          type="button"
          onClick={onSeed}
          disabled={seeding}
          className="ln-btn ln-btn-ghost ln-btn-sm"
          title="Reload the five synthetic demo claims"
        >
          {seeding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Reset demo
        </button>
      </div>

      {claims.length === 0 ? (
        <EmptyState text="No claims yet. Tap Reset demo to load sample data." />
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {claims.map((c, i) => {
            const active = c.id === selectedId;
            const uphold = c.status === "uphold";
            const ready = c.status === "appeal_ready";
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-[var(--ln-hairline)] py-3.5 text-left transition-colors ${
                    active ? "bg-[var(--ln-container-low)]" : "hover:bg-[var(--ln-container-low)]/60"
                  }`}
                >
                  <span className="ln-mono-tiny w-6 shrink-0 pt-0.5 text-[var(--ln-muted)]">
                    {padIndex(i)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={`ln-body truncate font-medium ${
                          ready
                            ? "text-[var(--ln-primary)]"
                            : uphold
                              ? "text-[var(--ln-rec)]"
                              : "text-[var(--ln-text)]"
                        }`}
                      >
                        {c.carc_code} · CPT {c.cpt_codes.join(", ")}
                      </span>
                      <span className="ln-mono-sm shrink-0 text-[var(--ln-text-secondary)]">
                        $
                        {c.billed_amount.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <p className="ln-caption mt-0.5 truncate text-[var(--ln-muted)]">
                      {c.payer_name}
                    </p>
                    <p className="ln-caption mt-1 text-[var(--ln-text-secondary)]">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
