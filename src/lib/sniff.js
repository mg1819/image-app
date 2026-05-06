// Verify a file's first bytes match its claimed image MIME so a renamed
// .exe / .svg can't sneak past the type filter.
export async function sniffImage(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const is = (sig, offset = 0) =>
    sig.every((b, i) => head[offset + i] === b);

  if (is([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (is([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (is([0x52, 0x49, 0x46, 0x46]) && is([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}
