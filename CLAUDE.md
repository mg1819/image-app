# Notes for Claude

This file is for future Claude Code sessions working on this repo. Keep it
short and load-bearing — facts not derivable from reading the code.

## What this project is

A single-page React + Vite + Tailwind frontend whose only job is:
**POST two image files to an n8n webhook, render the binary response.**
There is no backend, no router, no database, no auth.

## What this project is NOT

- Not a full e-commerce app. The Rinascente screenshot in the parent dir was
  visual context the user shared once; ignore it.
- Not Next.js. Don't introduce SSR, app router, server actions.
- Not a pipeline. The webhook is a black box owned by n8n; the model lives
  outside this repo.

## Architecture in 30 seconds

- `src/config.js` — reads `import.meta.env`, validates, exports constants.
  Throws at import time on missing/bad env so failures are loud.
- `src/App.jsx` — owns all state (`image1`, `image2`, `loading`, `error`,
  `resultUrl`), the submit handler, and the layout.
- `src/components/UploadCard.jsx` — one upload slot. Validation (MIME,
  size, magic bytes) lives here, not in `App`.
- `src/lib/sniff.js` — first-bytes check for JPEG / PNG / WebP.

State is intentionally flat. Don't reach for Redux / Zustand / Context.

## Conventions worth following

- Read config from `src/config.js`, never directly from `import.meta.env` in
  components.
- All limits (timeouts, sizes, allowed MIMEs) come from `config.js`. If you
  add a new limit, add an env var with a default and validate it the same way.
- Every fetch should keep `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`,
  `cache: 'no-store'`, and an `AbortController` timeout.
- Every `URL.createObjectURL` must have a matching `revokeObjectURL` (on
  overwrite **and** on unmount).
- Tailwind utilities only. No CSS modules, no styled-components.

## Things that will bite you

- **Vite inlines `VITE_*` vars into the client bundle.** They are public.
  Never put secrets there. If the webhook ever needs auth, add a server proxy
  — don't paste a token into `.env`.
- **n8n has two webhook URLs per workflow** — a *test* URL (only fires after
  clicking "Listen for test event") and a *production* URL (works while the
  workflow is Active). The user wants the production one. If POSTs 404, that's
  usually the cause.
- **CORS errors are an n8n config issue**, not a frontend issue. Fix on the
  Webhook node; do not add a dev-server proxy as a workaround unless the user
  asks for it.
- The working directory has a **double space** in its name
  (`app  frontend`). Quote paths in shell commands.
- `package.json` pins `vite: ^8.0.10` (set by the user). Vite 8 prints
  `esbuild`/`rolldown` deprecation warnings from `@vitejs/plugin-react` —
  these are noise, not bugs. Don't "fix" them by swapping plugins unless asked.

## Verification loop

```bash
cd image-app
npm run dev          # http://localhost:5173
```

Manual smoke test (no automated tests in this project):
1. Upload `cloth/tsupa.jpeg` to Slot 1 and `cloth/red-hat.png` to Slot 2.
2. Click Generate.
3. Confirm in DevTools Network: request is `multipart/form-data` with two
   binary parts; response `Content-Type` is `image/*`.
4. Negative paths: stop n8n → connection error; drop a 10 MB file → size error;
   drop a `.pdf` → rejected by `accept` filter.

## What to ask the user before doing

- Adding any backend / proxy / auth.
- Adding state management or routing libraries.
- Bumping the Vite major version (they pinned it deliberately).
- Switching from React to Next.js / another framework.
- Adding test infrastructure — none exists; don't add Jest/Vitest unsolicited.
