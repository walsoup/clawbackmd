"use client";

export function PrivacyBadge({
  local,
  label,
}: {
  local: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--ln-pill-radius)] px-2.5 py-1 ln-caption font-medium ${
        local
          ? "bg-[var(--ln-container)] text-[var(--ln-primary)]"
          : "bg-[var(--ln-rec-soft)] text-[var(--ln-rec)]"
      }`}
      title="From LLM_BASE_URL and database endpoint"
    >
      {label}
    </span>
  );
}
