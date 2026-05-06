import { useEffect, useRef, useState } from 'react';
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES } from '../config.js';
import { sniffImage } from '../lib/sniff.js';

export default function UploadCard({ label, placeholder, file, onFileChange }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = async (f) => {
    setError('');
    if (!f) return;
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
      setError(`Image must be ${mb} MB or smaller.`);
      return;
    }
    const sniffed = await sniffImage(f);
    if (sniffed !== f.type) {
      setError('File contents do not match its image type.');
      return;
    }
    onFileChange(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clear = (e) => {
    e.stopPropagation();
    setError('');
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-300 tracking-wide uppercase">
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'group relative cursor-pointer rounded-xl border backdrop-blur-md transition-all',
          'aspect-[4/5] flex items-center justify-center overflow-hidden',
          dragOver
            ? 'border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-500/40'
            : 'border-white/10 bg-white/5 hover:border-indigo-400/60 hover:bg-white/10',
        ].join(' ')}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            >
              Remove
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="rounded-full border border-white/10 bg-white/5 p-3">
              <svg
                className="h-6 w-6 text-indigo-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 7.5 12 3m0 0L7.5 7.5M12 3v13" />
              </svg>
            </div>
            <p className="text-sm text-slate-300">{placeholder}</p>
            <p className="text-xs text-slate-500">
              JPEG / PNG / WebP · max {(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(',')}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
