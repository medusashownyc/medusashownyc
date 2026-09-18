import { html, useState, useEffect } from '../lib/preact.js';
import { thumbUrl } from '../lib/images.js';

/** Image that loads a light resized version first and falls back to the original file if that isn't available. */
export function Thumb({ src, width = 320, class: className = '', style, alt = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src) return null;
  const url = failed || src.startsWith('blob:') ? src : thumbUrl(src, width);
  return html`<img class=${className} src=${url} alt=${alt} loading="lazy" decoding="async" style=${style} onError=${() => setFailed(true)} />`;
}
