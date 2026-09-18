import { html, useEffect } from '../lib/preact.js';
import { Icon } from './Icon.js';

/** Bottom sheet with a dimmed backdrop; closes on backdrop tap or Escape. */
export function Sheet({ open, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyHandler(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyHandler);
    document.body.classList.add('has-sheet');
    return () => {
      document.removeEventListener('keydown', onKeyHandler);
      document.body.classList.remove('has-sheet');
    };
  }, [open, onClose]);

  if (!open) return null;
  return html`
    <div class="sheet-backdrop" onClick=${onClose}>
      <div class=${`sheet ${wide ? 'sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-label=${title} onClick=${(e) => e.stopPropagation()}>
        <div class="sheet__grip" aria-hidden="true" />
        <div class="sheet__head">
          <h2 class="sheet__title">${title}</h2>
          <button class="sheet__close" type="button" onClick=${onClose} aria-label="Cerrar"><${Icon} name="close" /></button>
        </div>
        <div class="sheet__body">${children}</div>
      </div>
    </div>
  `;
}
