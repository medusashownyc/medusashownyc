import { html } from '../lib/preact.js';
import { Sheet } from './Sheet.js';
import { Button } from './Button.js';

/** Yes/no question in a sheet: used before discarding changes or deleting a show. */
export function ConfirmSheet({ open, title, text, confirmLabel, cancelLabel = 'Seguir editando', danger = false, onConfirm, onCancel }) {
  return html`
    <${Sheet} open=${open} title=${title} onClose=${onCancel}>
      <p class="sheet__text">${text}</p>
      <div class="sheet__actions">
        <${Button} variant=${danger ? 'danger' : 'primary'} onClick=${onConfirm}>${confirmLabel}<//>
        <${Button} variant="ghost" onClick=${onCancel}>${cancelLabel}<//>
      </div>
    <//>
  `;
}
