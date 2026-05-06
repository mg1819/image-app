# AI Virtual Try-On

Single-page web app that sends two images (a person and a garment) to a local n8n
webhook and renders the generated try-on image returned as a binary blob.

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
   ├─ App.jsx              # state, fetch, result rendering
   ├─ config.js            # env validation, exported constants
   ├─ lib/
   │  └─ sniff.js          # magic-byte image type check
   └─ components/
      └─ UploadCard.jsx    # one upload slot (drag-drop, preview, validation)
```

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
  throws at startup with a specific message.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR on `:5173` |
| `npm run build` | Production bundle to `dist/` |
| `npm run preview` | Serve the built bundle locally |
