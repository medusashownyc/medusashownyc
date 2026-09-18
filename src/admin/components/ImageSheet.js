import { html, useEffect, useState, useRef } from '../lib/preact.js';
import { Sheet } from './Sheet.js';
import { Icon } from './Icon.js';
import { Skeleton } from './Skeleton.js';
import { Thumb } from './Thumb.js';

/** Photo picker: upload from the phone, or reuse a photo already on the site. */
export function ImageSheet({ open, field, media, onPick, onClose }) {
  const [library, setLibrary] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    const load = () => media.library(field).then(setLibrary).catch((e) => {
      if (e.code === 'UNAUTHORIZED' && media.reauth) media.reauth(load, () => setError('No has vuelto a entrar. Cierra esta ventana y ábrela de nuevo cuando quieras.'), (message) => setError(message));
      else setError(e.message);
    });
    load();
  }, [open, field, media]);

  async function onFileHandler(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onPick(await media.upload(field, file));
      onClose();
    } catch (e) {
      setError(e.message || 'No se pudo preparar la foto.');
    } finally {
      setBusy(false);
    }
  }

  return html`
    <${Sheet} open=${open} title=${field.label} onClose=${onClose} wide>
      <label class=${`upload ${busy ? 'is-busy' : ''}`}>
        <input ref=${fileInput} type="file" accept=${field.accept || 'image/*'} onChange=${onFileHandler} disabled=${busy} />
        ${busy ? html`<span class="spinner" aria-hidden="true" />` : html`<${Icon} name="camera" />`}
        <span class="upload__title">${busy ? 'Preparando la foto…' : 'Subir desde el teléfono'}</span>
        <span class="upload__text">Vale la foto original: se ajusta sola al peso ideal para la web.</span>
      </label>
      ${error && html`<p class="notice notice--error"><${Icon} name="warning" /> ${error}</p>`}
      <p class="eyebrow sheet__eyebrow">O elige una que ya está en la web</p>
      ${!library && !error && html`<${Skeleton} lines=${2} />`}
      ${library && library.length === 0 && html`<p class="field__hint">Todavía no hay fotos en esta carpeta.</p>`}
      ${library && library.length > 0 && html`
        <div class="library">
          ${library.map((item) => html`
            <button type="button" class="library__item" key=${item.publicPath} onClick=${() => { onPick(item.publicPath); onClose(); }} title=${item.name}>
              <${Thumb} src=${media.previewUrl(item.publicPath, 'thumb')} width=${320} />
            </button>
          `)}
        </div>
      `}
    <//>
  `;
}
