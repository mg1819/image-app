import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapAuthError(message) {
  if (!message) return 'Something went wrong. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox.';
  }
  if (m.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (m.includes('password should be')) return message;
  return message;
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const validate = () => {
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (mode === 'signup') {
      if (!name.trim()) return 'Enter your name.';
      if (password !== confirm) return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) {
          setError(mapAuthError(err.message));
        } else if (data.user && !data.session) {
          setInfo(
            'Account created. Check your email for a confirmation link, then sign in.'
          );
          setMode('signin');
          setPassword('');
          setConfirm('');
          setName('');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) setError(mapAuthError(err.message));
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen w-full px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            AI Virtual Try-On
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isSignup ? 'Create an account to get started.' : 'Sign in to continue.'}
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={[
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                !isSignup
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={[
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isSignup
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <Field
                label="Name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={setName}
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={setPassword}
              required
            />
            {isSignup && (
              <Field
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
                required
              />
            )}

            {error && (
              <p className="text-sm text-rose-400">{error}</p>
            )}
            {info && (
              <p className="text-sm text-emerald-400">{info}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={[
                'inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold tracking-wide text-white transition-all',
                'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30',
                submitting
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-indigo-500/50 hover:brightness-110 active:scale-[0.99]',
              ].join(' ')}
            >
              {submitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  {isSignup ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                <>{isSignup ? 'Create account' : 'Sign in'}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, autoComplete, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-300">
        {label}
      </span>
      <input
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-400/60 focus:bg-white/10"
      />
    </label>
  );
}
