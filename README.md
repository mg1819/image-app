# AI Virtual Try-On

Single-page web app that sends two images (a person and a garment) to a local n8n
webhook and renders the generated try-on image returned as a binary blob. Access
is gated behind email/password auth backed by Supabase.

![flow](https://img.shields.io/badge/POST-multipart%2Fform--data-6366f1) ![stack](https://img.shields.io/badge/React%2018-Vite%208-Tailwind%203-0ea5e9)

## Quick start

```bash
cp .env.example .env       # adjust VITE_WEBHOOK_URL if needed
npm install
npm run dev                # http://localhost:5173
```

The n8n workflow at `VITE_WEBHOOK_URL` must be **Active** (production URL — the
"Listen for test event" URL only fires once per click in the n8n editor).

## How it works

0. Anonymous visitors see a sign-in / sign-up screen. Sign-up captures name,
   email, password; Supabase emails a confirmation link that the user must
   click before logging in. The name is stored in `auth.users.user_metadata`.
1. User drops a person image into Slot 1 and a garment image into Slot 2.
2. Each upload is validated client-side: MIME allowlist, max-size, **magic-byte
   sniff** to reject files whose extension/MIME doesn't match their actual bytes.
3. On **Generate**, both files are posted as `multipart/form-data` with field
   names `image1` and `image2`.
4. The webhook returns an `image/*` blob. The app wraps it in
   `URL.createObjectURL(...)` and shows it in the result panel.

## Configuration (`.env`)

All config is read at startup from `import.meta.env`. Missing or invalid values
throw immediately so a misconfigured deployment never silently runs.

| Var | Default | Purpose |
|---|---|---|
| `VITE_WEBHOOK_URL` | _required_ | n8n production webhook URL (http/https only) |
| `VITE_REQUEST_TIMEOUT_MS` | `120000` | Aborts the fetch via `AbortController` if n8n hangs |
| `VITE_MAX_UPLOAD_BYTES` | `5242880` (5 MB) | Per-file upload cap |
| `VITE_MAX_RESPONSE_BYTES` | `20971520` (20 MB) | Cap on the returned blob |
| `VITE_SUPABASE_URL` | _required_ | Supabase project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | _required_ | Supabase publishable / anon key (browser-safe) |

> **Vite secrets warning.** Any `VITE_*` var is inlined into the client bundle
> and visible to anyone who loads the page. The webhook URL is fine here (it's
> an endpoint, not a secret). **Never** put API keys or DB credentials in
> `VITE_*` — front them with a small server proxy instead.

## Project layout

```
image-app/
├─ index.html
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ .env / .env.example
└─ src/
   ├─ main.jsx
   ├─ index.css            # Tailwind + dark gradient bg
   ├─ App.jsx              # auth gate + state, fetch, result rendering
   ├─ config.js            # env validation, exported constants
   ├─ lib/
   │  ├─ sniff.js          # magic-byte image type check
   │  ├─ supabase.js       # supabase-js client singleton
   │  └─ useAuth.js        # session + loading hook
   └─ components/
      ├─ UploadCard.jsx    # one upload slot (drag-drop, preview, validation)
      └─ AuthScreen.jsx    # sign-in / sign-up tabs
```

## Auth

Supabase email/password. No `profiles` table — name lives in `user_metadata`
(passed via `signUp({ options: { data: { name } } })`).

Required Supabase dashboard setup:

- **Authentication → Providers → Email**: enabled, "Confirm email" ON.
- **Authentication → URL Configuration**:
  - Site URL: production app URL (e.g. your Vercel domain).
  - Redirect URLs: add `http://localhost:5173` (and `5174`/`5175` if dev
    server falls back), plus the Vercel preview URL pattern.

Use the **publishable** key (`sb_publishable_...` or legacy `anon`) for
`VITE_SUPABASE_PUBLISHABLE_KEY`. **Never** put the `service_role` or
`sb_secret_...` key in any `VITE_*` var — it bypasses RLS.

## Security notes

- Webhook URL and limits live in `.env`; `.gitignore` matches `.env.*` with an
  `!.env.example` carve-out.
- 120 s `AbortController` timeout on the upload request.
- Response size capped (`Content-Length` header + actual blob size).
- Fetch sent with `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`,
  `cache: 'no-store'`.
- Uploads validated by MIME **and** magic bytes (JPEG / PNG / WebP).
- Result `<img>` is a `blob:` URL; revoked on overwrite and on component
  unmount to avoid leaks.

## Troubleshooting

- **"Cannot connect to the webhook."** n8n isn't running, the workflow isn't
  Active, or browser CORS blocked the request. Enable CORS on the n8n Webhook
  node — don't proxy from the frontend.
- **"Webhook did not return an image."** The n8n workflow's last node must
  output binary data with an `image/*` content type (use a *Respond to Webhook*
  node set to *Binary*).
- **"Request timed out."** Bump `VITE_REQUEST_TIMEOUT_MS` if the model is slow,
  or check the n8n execution log.
- **Blank page on load.** Open DevTools console — a missing/invalid env var
  throws at startup with a specific message. Most common after the auth
  change: `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` not set.
- **Confirmation email link goes nowhere / "redirect not allowed".** Add
  the dev origin (e.g. `http://localhost:5175`) to Supabase Authentication →
  URL Configuration → Redirect URLs.
- **"Please confirm your email first."** Check inbox/spam for the Supabase
  confirmation link, or manually confirm the user in the Supabase dashboard
  (Authentication → Users → row → "Confirm email").

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR on `:5173` |
| `npm run build` | Production bundle to `dist/` |
| `npm run preview` | Serve the built bundle locally |
