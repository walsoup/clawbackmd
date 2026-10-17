# Hacktoberfest Week 2 — submit checklist

**Deadline:** Sunday Oct 18, 2026 · 11:59 PM PDT  
**Challenge:** Side Hustle · tag `#hf26challenge`  
**Good fit for:** Best Use of Gemma (local Ollama + open-weight model)

## Before you leave the cafe

1. `npm install && npm test && npm run build`
2. `npm run dev` → open http://localhost:3000
3. Click **Generate draft** on CLM-001…004 (cached fallback if Ollama is off)
4. Open **CLM-005** — should say uphold / do not appeal
5. Edit a letter section + **Approve & sign**
6. **Custom denial** → load a template → Run analysis

## DEV post

- Draft is staged via DevRelay (unpublished). Publish from the `edit_url`.
- Required tag: `hf26challenge`
- Say who would pay (hospital billing / RCM), why open/local Gemma matters (PHI stays local), link the repo, show a demo GIF/screenshot.

## Repo

```bash
git add -A && git status
# commit when ready, then push to GitHub and paste the URL into the DEV post
```
