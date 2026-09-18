import { html, useState } from '../lib/preact.js';
import { Button } from './Button.js';
import { ImageSheet } from './ImageSheet.js';

/** Photo field: big preview with "Cambiar foto"; new uploads show at once and go up when saving. */
export function FieldImage({ field, value, onChange, media }) {
  const [open, setOpen] = useState(false);
  const url = media.previewUrl(value, 'large');
  const pending = media.isPending(value);
  return html`
    <div class="field">
      <p class="field__label">${field.label}</p>
      <div class=${`photo ${url ? '' : 'photo--empty'} ${field.mediaFolder === '..' ? 'photo--logo' : ''}`}>
        ${url ? html`<img src=${url} alt="" />` : html`<span class="photo__placeholder">Sin foto</span>`}
        ${pending && html`<span class="photo__pending">Nueva · se sube al guardar</span>`}
        <div class="photo__actions">
          <${Button} variant="light" icon="camera" onClick=${() => setOpen(true)}>${url ? 'Cambiar foto' : 'Elegir foto'}<//>
        </div>
      </div>
      ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
      <${ImageSheet} open=${open} field=${field} media=${media} onPick=${onChange} onClose=${() => setOpen(false)} />
    </div>
  `;
}
