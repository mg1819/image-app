import { useEffect, useState } from 'react';
import UploadCard from './components/UploadCard.jsx';
import {
  WEBHOOK_URL,
  REQUEST_TIMEOUT_MS,
  MAX_RESPONSE_BYTES,
  ACCEPTED_MIME,
} from './config.js';

export default function App() {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const canSubmit = image1 && image2 && !loading;

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const fd = new FormData();
      fd.append('image1', image1);
      fd.append('image2', image2);

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: fd,
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status} ${res.statusText}`);
      }

      const declaredLen = Number(res.headers.get('Content-Length'));
      if (Number.isFinite(declaredLen) && declaredLen > MAX_RESPONSE_BYTES) {
        throw new Error('Response is too large.');
      }

      const blob = await res.blob();
      if (blob.size > MAX_RESPONSE_BYTES) {
        throw new Error('Response is too large.');
      }
      if (!ACCEPTED_MIME.includes(blob.type) && !blob.type.startsWith('image/')) {
        throw new Error('Webhook did not return an image.');
      }

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError(`Request timed out after ${(REQUEST_TIMEOUT_MS / 1000).toFixed(0)}s.`);
      } else if (err instanceof TypeError) {
        setError(
          'Cannot connect to the webhook. Check that n8n is running and CORS is enabled.'
        );
      } else {
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            n8n webhook
          </div>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            AI Virtual Try-On
          </h1>
          <p className="mt-3 text-slate-400">
            Upload a person and a garment to generate a new look.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <UploadCard
            label="Target Person"
            placeholder="Click or drag person image"
            file={image1}
            onFileChange={setImage1}
          />
          <UploadCard
            label="Garment"
            placeholder="Click or drag clothing image"
            file={image2}
            onFileChange={setImage2}
          />
        </section>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className={[
              'inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold tracking-wide text-white transition-all',
              'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30',
              canSubmit
                ? 'hover:shadow-indigo-500/50 hover:brightness-110 active:scale-[0.99]'
                : 'opacity-40 cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                Generating…
              </>
            ) : (
              <>Generate</>
            )}
          </button>
          {error && (
            <p className="max-w-md text-center text-sm text-rose-400">{error}</p>
          )}
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-300">
            Generated Result
          </h2>
          <div
            className={[
              'mx-auto flex w-full max-w-xl items-center justify-center overflow-hidden rounded-xl backdrop-blur-md',
              resultUrl
                ? 'border border-white/10 bg-white/5'
                : 'border-2 border-dashed border-white/15 bg-white/[0.02]',
              'aspect-[4/5]',
            ].join(' ')}
          >
            {resultUrl ? (
              <img
                src={resultUrl}
                alt="Generated try-on"
                className="h-full w-full object-contain"
              />
            ) : loading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <svg className="h-8 w-8 animate-spin text-indigo-300" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <p className="text-sm">Synthesising image…</p>
              </div>
            ) : (
              <p className="px-6 text-center text-sm text-slate-500">
                Your generated image will appear here.
              </p>
            )}
          </div>
          {resultUrl && (
            <div className="mt-4 flex justify-center">
              <a
                href={resultUrl}
                download="tryon-result.jpg"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur hover:bg-white/10"
              >
                Download
              </a>
            </div>
          )}
        </section>

        <footer className="mt-16 text-center text-xs text-slate-600">
          POST multipart/form-data → image1, image2 · Response: binary image blob
        </footer>
      </div>
    </div>
  );
}
