import { html } from '../lib/preact.js';
import { Button } from './Button.js';

/** Sticky save bar that slides in while there are unsaved changes. */
export function BottomBar({ visible, onSave, onDiscard, label = 'Guardar y publicar', busy = false }) {
  return html`
    <div class=${`bottombar ${visible ? 'is-visible' : ''}`} aria-hidden=${!visible}>
      <div class="bottombar__inner">
        <p class="bottombar__note">Tienes cambios sin guardar</p>
        <div class="bottombar__actions">
          <${Button} variant="ghost" onClick=${onDiscard} disabled=${busy}>Descartar<//>
          <${Button} variant="primary" icon="check" onClick=${onSave} busy=${busy}>${label}<//>
        </div>
      </div>
    </div>
  `;
}
