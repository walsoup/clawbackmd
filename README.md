# ClawbackMD

Draft appeals for AI-assisted insurance denials. Built for hospital billing review.

**All data is synthetic.** Every letter is a **draft** requiring physician and billing review. Not medical or legal advice.

UI follows the [Linen](./linen) design system (calm linen surfaces, forest accent, hairlines — no dark “war room” chrome).

## Quickstart (no Docker)

```bash
npm install
cp .env.example .env.local   # USE_MEMORY_STORE=true by default
npm run gen:seed             # regenerates supabase/seed.sql if you ever need Postgres
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Five demo claims load in memory. Click **Generate draft** — if Ollama isn’t running, the app uses the cached draft.

### Optional: local model

```bash
ollama pull gemma3
ollama serve
```

### Optional: Postgres (Supabase)

Only if you want persistence beyond the process lifetime:

1. Start a Postgres that matches `supabase/migrations/0001_init.sql` (local Supabase CLI *or* hosted).
2. Set `USE_MEMORY_STORE=false` and fill `SUPABASE_*` keys in `.env.local`.
3. `npm run gen:seed && npx supabase db reset` (or run the generated SQL yourself).

Docker is **not** required for the default demo.

## Stack

Next.js (App Router, TypeScript), Tailwind + Linen tokens, lucide-react, in-memory store by default, optional Supabase, one OpenAI-compatible LLM adapter (`lib/llm.ts`).

## Guardrails

Enforced in code ([`lib/validate.ts`](lib/validate.ts)):

1. Evidence and policy quotes must be verbatim substrings (exact, then whitespace-normalized).
2. Retry once on validation failure, then drop bad items.
3. Force `verdict: "weak"` when nothing valid survives.
4. Citations only from DB policy codes + [`lib/regulations.ts`](lib/regulations.ts).

## Scripts

```bash
npm test          # unit tests
npm run eval      # live pipeline vs 5 claims (needs a model)
npm run gen:seed  # data/seed.ts → supabase/seed.sql
```

## Auth

`DEMO_MODE=true` skips login. With `false`, magic-link needs Supabase Auth configured.
