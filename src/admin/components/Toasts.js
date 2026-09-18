import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';

/** Stack of short notices at the bottom of the screen. */
export function Toasts({ items }) {
  if (!items.length) return null;
  return html`
    <div class="toasts" aria-live="polite">
      ${items.map((toast) => html`
        <div class=${`toast toast--${toast.kind}`} key=${toast.id}>
          <${Icon} name=${toast.kind === 'error' ? 'warning' : 'check'} />
          <span>${toast.message}</span>
        </div>
      `)}
    </div>
  `;
}
