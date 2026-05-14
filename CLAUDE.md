# Notes for Claude

This file is for future Claude Code sessions working on this repo. Keep it
short and load-bearing — facts not derivable from reading the code.

## What this project is

A single-page React + Vite + Tailwind frontend whose job is:
**POST two image files to an n8n webhook, render the binary response.**
The generator UI is gated behind (1) Supabase email/password auth and
(2) a one-time Stripe Payment Link unlock tracked in `profiles.has_paid`.
Server-side dependencies: Supabase (Auth + Postgres + a `confirm-payment`
Edge Function + Realtime), Stripe (Payment Link only — verification happens
in the Edge Function), and the n8n webhook.

## What this project is NOT

- Not a full e-commerce app. The Rinascente screenshot in the parent dir was
  visual context the user shared once; ignore it.
- Not Next.js. Don't introduce SSR, app router, server actions.
- Not a pipeline. The webhook is a black box owned by n8n; the model lives
  outside this repo.

## Architecture in 30 seconds

- `src/config.js` — reads `import.meta.env`, validates, exports constants
  (webhook + Supabase + Stripe payment link). Throws at import time on
  missing/bad env so failures are loud. **A missing `VITE_SUPABASE_*` or
  `VITE_STRIPE_PAYMENT_LINK` var = blank page; check console.**
- `src/lib/supabase.js` — single `createClient()` instance. Components import
  `supabase` from here, never call `createClient` themselves.
- `src/lib/useAuth.js` — `{ session, loading }`. Seeds via `getSession()`,
  then `onAuthStateChange`. `loading` stays true until the first
  `getSession()` resolves so we don't flash the login screen for users
  with a valid session.
- `src/components/AuthScreen.jsx` — sign-in / sign-up tabs. Signup writes
  name to `user_metadata` (`options.data.name`).
- `src/lib/useProfile.js` — `{ profile, loading, error, refresh }`. Fetches
  the user's `profiles` row (`id, has_paid`), falls back to a synthetic
  `{ has_paid: false }` if no row yet, and subscribes to Realtime `UPDATE`
  events so the paywall drops the instant the Edge Function flips the flag.
- `src/components/Paywall.jsx` — Stripe Payment Link entry point. Builds
  the checkout href with `client_reference_id` (Supabase user id) and
  `prefilled_email`. On return (`?paid=1&session_id=...`) it POSTs the
  session id to the `confirm-payment` Edge Function with the user's JWT,
  then calls `refresh()` and strips the params from the URL.
- `src/App.jsx` — calls `useAuth()` + `useProfile()`. Spinner while either
  is loading, `<AuthScreen />` when no session, `<Paywall />` when signed
  in but `!has_paid`, generator otherwise. Owns generator state (`image1`,
  `image2`, `loading`, `error`, `resultUrl`).
- `src/components/UploadCard.jsx` — one upload slot. Validation (MIME,
  size, magic bytes) lives here, not in `App`.
- `src/lib/sniff.js` — first-bytes check for JPEG / PNG / WebP.

State is intentionally flat. Don't reach for Redux / Zustand / Context.
Don't add a router — auth gating is a simple ternary in `App.jsx`.

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
- Use the `supabase` client from `src/lib/supabase.js`. Don't call
  `createClient` again — multiple clients = multiple session listeners.
- User name lives in `session.user.user_metadata.name`. The `profiles`
  table exists only to hold `has_paid` (set by the `confirm-payment` Edge
  Function via the service role). If you need more profile fields, prefer
  `user_metadata` unless the data must be queryable from the server.
- Anything that mutates `profiles.has_paid` from the client is a bug —
  only the Edge Function (service role) should write that column. RLS on
  `profiles` must forbid client `UPDATE`s on `has_paid`.

## Things that will bite you

- **Vite inlines `VITE_*` vars into the client bundle.** They are public.
  Never put secrets there. The Supabase **publishable** (anon) key is
  browser-safe and belongs here; the **`service_role` / `sb_secret_*`** key
  bypasses RLS and must NEVER be added to a `VITE_*` var. If the webhook
  ever needs auth, add a server proxy — don't paste a token into `.env`.
- **Supabase email confirmation requires Redirect URLs to be configured.**
  The dev server falls back from 5173 → 5174 → 5175 when ports are busy;
  the Site URL / Redirect URLs in Supabase → Authentication → URL
  Configuration must list every origin the link can land on, or
  confirmation will fail with "redirect not allowed".
- **Stripe Payment Link redirect must include `{CHECKOUT_SESSION_ID}`.** The
  Paywall keys off `?paid=1&session_id=...`; without `session_id` it can't
  call the confirm-payment Edge Function. Configure: Payment Link → After
  payment → Don't show confirmation page → custom URL with
  `?paid=1&session_id={CHECKOUT_SESSION_ID}` (Stripe substitutes the id).
- **Vercel deploys need all required env vars set per environment.** A blank
  page after deploy is almost always a missing `VITE_*` var — `config.js`
  throws at import time and React never mounts. Check the browser console.
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
0. App should open on the sign-in screen. Create an account, confirm via
   email link, then sign in. Reload → still signed in (session persisted).
0a. New account should land on the paywall. Click Unlock → complete Stripe
   test checkout → redirect back → paywall disappears (Realtime) or after
   "Already paid? Refresh status". `profiles.has_paid` should be `true`.
1. Upload `cloth/tsupa.jpeg` to Slot 1 and `cloth/red-hat.png` to Slot 2.
2. Click Generate.
3. Confirm in DevTools Network: request is `multipart/form-data` with two
   binary parts; response `Content-Type` is `image/*`.
4. Negative paths: stop n8n → connection error; drop a 10 MB file → size error;
   drop a `.pdf` → rejected by `accept` filter.

## What to ask the user before doing

- Adding any backend / proxy / auth provider beyond the existing Supabase
  email-password flow (e.g. OAuth, magic links, SSO).
- Adding new columns to `profiles` or new tables/schemas in Supabase
  (`profiles` currently exists only for `has_paid` — keep it minimal).
- Changing the payment model (subscription, multi-tier, refunds flow) —
  the current design is one-time payment, lifetime unlock.
- Adding state management or routing libraries.
- Bumping the Vite major version (they pinned it deliberately).
- Switching from React to Next.js / another framework.
- Adding test infrastructure — none exists; don't add Jest/Vitest unsolicited.
