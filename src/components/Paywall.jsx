import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { STRIPE_PAYMENT_LINK, PRICE_LABEL, SUPABASE_URL } from '../config.js';

export default function Paywall({ session, onConfirmed, refresh }) {
  const user = session?.user;
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const polledRef = useRef(false);

  const checkoutHref = (() => {
    const url = new URL(STRIPE_PAYMENT_LINK);
    if (user?.id) url.searchParams.set('client_reference_id', user.id);
    if (user?.email) url.searchParams.set('prefilled_email', user.email);
    return url.toString();
  })();

  useEffect(() => {
    if (polledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const paid = params.get('paid');
    if (!paid || !sessionId) return;
    polledRef.current = true;

    (async () => {
      setStatus('confirming');
      setError('');
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) {
          setError('You need to be signed in to confirm payment.');
          setStatus('error');
          return;
        }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('error');
          setError(body?.detail || body?.error || `Confirmation failed (${res.status}).`);
          return;
        }
        await refresh?.();
        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete('paid');
        cleaned.searchParams.delete('session_id');
        window.history.replaceState({}, '', cleaned.toString());
        onConfirmed?.();
      } catch (err) {
        setStatus('error');
        setError(err?.message || 'Unexpected error confirming payment.');
      }
    })();
  }, [onConfirmed, refresh]);

  const confirming = status === 'confirming';
  const displayName = user?.user_metadata?.name || user?.email || '';

  return (
    <div className="min-h-screen w-full px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
          <span className="text-sm text-slate-300">
            Signed in as <span className="font-medium text-white">{displayName}</span>
          </span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </div>

        <header className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Unlock AI Virtual Try-On
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            One-time payment. Unlimited generations.
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-6 text-center">
            <div className="text-5xl font-bold text-white">{PRICE_LABEL}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              one-time · lifetime access
            </div>
          </div>

          <ul className="mb-6 space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-400">✓</span>
              Unlimited try-on generations
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-400">✓</span>
              Pay once, no subscription
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-400">✓</span>
              Secure checkout by Stripe
            </li>
          </ul>

          {confirming ? (
            <div className="flex flex-col items-center gap-3 py-4 text-slate-300">
              <svg className="h-6 w-6 animate-spin text-indigo-300" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <p className="text-sm">Confirming your payment…</p>
            </div>
          ) : (
            <a
              href={checkoutHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-base font-semibold tracking-wide text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 hover:brightness-110 active:scale-[0.99]"
            >
              Unlock for {PRICE_LABEL}
            </a>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-rose-400">{error}</p>
          )}

          <button
            type="button"
            onClick={() => refresh?.()}
            className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-white/10"
          >
            Already paid? Refresh status
          </button>
        </div>
      </div>
    </div>
  );
}
