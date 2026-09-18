// Vercel functions reject request bodies over 4.5 MB, so a save with several
// photos is split into consecutive commits: photos first, in groups that stay
// under the limit, and the content file in the last one.
const MAX_BATCH_BYTES = 3.5 * 1024 * 1024;
const MAX_BATCH_FILES = 30;

/** Byte size of a file as it travels in the request (base64 text or UTF-8 content). */
function sizeOf(file) {
  return file.base64 ? file.base64.length : new TextEncoder().encode(file.content || '').length;
}

/** Splits files into batches under the request-size and file-count limits; the `last` files (content JSON) always go in the final batch. */
export function splitIntoBatches(uploads, last, maxBytes = MAX_BATCH_BYTES, maxFiles = MAX_BATCH_FILES) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const file of uploads) {
    const bytes = sizeOf(file);
    if (bytes > maxBytes) throw new Error('Una de las fotos pesa demasiado incluso después de ajustarla. Prueba con otra foto.');
    if (current.length && (size + bytes > maxBytes || current.length >= maxFiles)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(file);
    size += bytes;
  }
  const lastBytes = last.reduce((sum, file) => sum + sizeOf(file), 0);
  if (current.length && (size + lastBytes > maxBytes || current.length + last.length > maxFiles)) {
    batches.push(current);
    current = [];
  }
  batches.push([...current, ...last]);
  return batches;
}
