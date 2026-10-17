"use client";

export function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: Array<{ start: number; end: number }>;
}) {
  if (!ranges.length) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((r, i) => {
    const start = Math.max(0, Math.min(text.length, r.start));
    const end = Math.max(start, Math.min(text.length, r.end));
    if (start > cursor) {
      parts.push(<span key={`t-${i}`}>{text.slice(cursor, start)}</span>);
    }
    parts.push(
      <mark key={`m-${i}`} className="ln-mark">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });

  if (cursor < text.length) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
