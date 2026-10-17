<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI

Build every screen with the **Linen** design system. Follow [`linen/AGENTS.md`](linen/AGENTS.md) and tokens in [`linen/tokens.json`](linen/tokens.json).

Web port lives in `app/globals.css` (`--ln-*` variables) and `components/ui.tsx`.

Rules that matter for ClawbackMD:

- Light linen background (`#FAF9F6`), forest primary (`#2D6A4F`), terracotta only for attention/denials (`#D47255`).
- Flat: hairlines and whitespace, not cards or shadows. No purple, no gradients, no glow.
- Numbers use monospace (`ln-mono*`). Page titles use the wordmark with a green period (`ClawbackMD.`).
- Buttons are pills (`ln-btn` primary / tonal / ghost). Copy stays calm and clinical — never “war room” tone.
- Main screen component: `components/AppealsWorkbench.tsx` (not WarRoom).
