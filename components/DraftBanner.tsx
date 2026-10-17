export function DraftBanner() {
  return (
    <div className="border-b border-[var(--ln-hairline)] bg-[var(--ln-rec-soft)] px-4 py-2.5 text-center ln-caption font-medium text-[var(--ln-rec)] print:bg-[var(--ln-rec-soft)]">
      Draft — requires physician and billing review before sending
    </div>
  );
}
