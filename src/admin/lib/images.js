// Photo helpers for the panel: preparing uploads in the browser (resize,
// re-encode as WebP, name the file) and building light thumbnail URLs so a
// phone never downloads full-size photos just to show a card.
import { slugify } from './form.js';
import { isLocalMode } from './backend.js';

const MAX_SIZE = 2400;
const QUALITY = 0.85;
const THUMB_QUALITY = 70;

/** Decodes a picked file into a bitmap, honoring EXIF orientation when the browser supports it. */
async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new Error('No se pudo leer esta foto. Prueba a guardarla como JPG en el teléfono o elige otra.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Resizes and re-encodes a picked image (SVG isn't accepted: it can carry scripts). */
export async function prepareImage(file) {
  if (file.type === 'image/svg+xml') throw new Error('Los archivos SVG no se pueden subir desde el panel. Usa una imagen JPG o PNG.');
  const source = await decode(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  if (source.close) source.close();
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
  let ext = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    ext = 'jpg';
  }
  if (!blob) throw new Error('No se pudo procesar la foto. Inténtalo con otra.');
  return { blob, ext, width: canvas.width, height: canvas.height };
}

/** File name for an upload: slug of the original name plus a short random suffix so two uploads never collide. */
export function imageFileName(originalName, ext) {
  const base = slugify(originalName.replace(/\.[^.]+$/, '')) || 'foto';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}.${ext}`;
}

/** Base64 body of a blob (no data: prefix), as the GitHub API expects. */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Resized version of a site image via Vercel's image optimization (sizes declared in vercel.json); the plain path on localhost and for SVGs. */
export function thumbUrl(path, width = 320) {
  if (!path || isLocalMode() || /\.svg$/i.test(path) || !path.startsWith('/')) return path || '';
  return `/_vercel/image?url=${encodeURIComponent(path)}&w=${width}&q=${THUMB_QUALITY}`;
}
