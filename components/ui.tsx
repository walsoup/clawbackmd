/** Small Linen primitives shared across screens. */

export function Hairline({ className = "" }: { className?: string }) {
  return <hr className={`ln-hairline ${className}`} />;
}

export function Wordmark({ text }: { text: string }) {
  return (
    <h1 className="ln-display text-[var(--ln-text)]">
      {text}
      <span className="text-[var(--ln-primary)]">.</span>
    </h1>
  );
}

export function PageHeader({
  overline,
  title,
  lede,
  actions,
}: {
  overline: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ln-overline">{overline}</p>
          <div className="mt-1.5">
            <Wordmark text={title} />
          </div>
          {lede && (
            <p className="ln-body-sec mt-1.5 text-[var(--ln-text-secondary)]">
              {lede}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <Hairline className="mt-[18px]" />
    </header>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="ln-overline mt-7 mb-1 text-[var(--ln-muted)]">{children}</p>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ln-title mt-7 mb-1 text-[var(--ln-text)]">{children}</h2>
  );
}

export function TextTabs({
  tabs,
  selected,
  onSelect,
}: {
  tabs: string[];
  selected: string;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="flex gap-6 border-t border-[var(--ln-hairline)] px-1 pt-3">
      {tabs.map((t) => {
        const active = t === selected;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            className={`ln-label relative pb-3 ${
              active
                ? "text-[var(--ln-primary)]"
                : "text-[var(--ln-muted)] hover:text-[var(--ln-text-secondary)]"
            }`}
          >
            {t}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[var(--ln-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <p className="ln-body-sec py-10 text-center text-[var(--ln-muted)]">
      {text}
    </p>
  );
}

export function FactRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-3 ${
        last ? "" : "border-b border-[var(--ln-hairline)]"
      }`}
    >
      <span className="ln-body text-[var(--ln-text)]">{label}</span>
      <span className="ln-body-sec text-right text-[var(--ln-text-secondary)]">
        {value}
      </span>
    </div>
  );
}
