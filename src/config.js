const requireEnv = (key) => {
  const v = import.meta.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}. Copy .env.example to .env.`);
  return v;
};

const num = (key, fallback) => {
  const v = import.meta.env[key];
  const n = v === undefined ? fallback : Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Env var ${key} must be a positive number, got ${v}`);
  }
  return n;
};

const rawUrl = requireEnv('VITE_WEBHOOK_URL');

let parsed;
try {
  parsed = new URL(rawUrl);
} catch {
  throw new Error(`VITE_WEBHOOK_URL is not a valid URL: ${rawUrl}`);
}
if (!['http:', 'https:'].includes(parsed.protocol)) {
  throw new Error(`VITE_WEBHOOK_URL must use http(s), got ${parsed.protocol}`);
}

export const WEBHOOK_URL = parsed.toString();
export const REQUEST_TIMEOUT_MS = num('VITE_REQUEST_TIMEOUT_MS', 120_000);
export const MAX_UPLOAD_BYTES = num('VITE_MAX_UPLOAD_BYTES', 5 * 1024 * 1024);
export const MAX_RESPONSE_BYTES = num('VITE_MAX_RESPONSE_BYTES', 20 * 1024 * 1024);
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const rawSupabaseUrl = requireEnv('VITE_SUPABASE_URL');
let parsedSupabase;
try {
  parsedSupabase = new URL(rawSupabaseUrl);
} catch {
  throw new Error(`VITE_SUPABASE_URL is not a valid URL: ${rawSupabaseUrl}`);
}
if (parsedSupabase.protocol !== 'https:') {
  throw new Error(`VITE_SUPABASE_URL must use https, got ${parsedSupabase.protocol}`);
}
export const SUPABASE_URL = parsedSupabase.toString().replace(/\/$/, '');
export const SUPABASE_PUBLISHABLE_KEY = requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

const rawPaymentLink = requireEnv('VITE_STRIPE_PAYMENT_LINK');
let parsedPaymentLink;
try {
  parsedPaymentLink = new URL(rawPaymentLink);
} catch {
  throw new Error(`VITE_STRIPE_PAYMENT_LINK is not a valid URL: ${rawPaymentLink}`);
}
if (parsedPaymentLink.protocol !== 'https:') {
  throw new Error(`VITE_STRIPE_PAYMENT_LINK must use https, got ${parsedPaymentLink.protocol}`);
}
export const STRIPE_PAYMENT_LINK = parsedPaymentLink.toString();
export const PRICE_LABEL = '$9.99';
