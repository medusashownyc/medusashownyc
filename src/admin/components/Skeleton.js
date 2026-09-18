import { html } from '../lib/preact.js';

/** Placeholder blocks shown while content loads. */
export function Skeleton({ lines = 3, card = false }) {
  return html`
    <div class=${`skeleton ${card ? 'skeleton--card' : ''}`} aria-hidden="true">
      ${Array.from({ length: lines }, (_, i) => html`<span class="skeleton__line" style=${`--w: ${[92, 70, 55, 80][i % 4]}%`} />`)}
    </div>
  `;
}
