"use client";

import { CountUp } from "./CountUp";
import { PrivacyBadge } from "./PrivacyBadge";
import { Hairline } from "./ui";
import type { KpiPayload } from "@/lib/kpis";

export function KpiBar({ kpis }: { kpis: KpiPayload | null }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 gap-6 py-5 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-[var(--ln-pill-radius)] bg-[var(--ln-container-low)]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 py-5 lg:grid-cols-4">
        <Metric label="Total denied">
          <p className="ln-mono-sm text-[var(--ln-text)]">
            {kpis.totalDeniedCount} claims
          </p>
          <p className="ln-mono-sm text-[var(--ln-text-secondary)]">
            $
            {kpis.totalDeniedAmount.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </p>
        </Metric>

        <Metric label="Appeal-ready">
          <p className="ln-mono-hero text-[28px] leading-8 text-[var(--ln-primary)] lg:text-[34px] lg:leading-9">
            <CountUp value={kpis.appealReadyAmount} />
          </p>
        </Metric>

        <Metric label="Avg draft time">
          <p className="ln-mono-sm text-[var(--ln-text)]">
            {kpis.avgLatencyLabel}
          </p>
          <p className="ln-caption text-[var(--ln-muted)]">
            vs ~45 min manual
          </p>
        </Metric>

        <Metric label="Privacy">
          <PrivacyBadge local={kpis.privacy.local} label={kpis.privacy.label} />
        </Metric>
      </div>
      <Hairline />
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="ln-overline mb-1.5">{label}</p>
      {children}
    </div>
  );
}
