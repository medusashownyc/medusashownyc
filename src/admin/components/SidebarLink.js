import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';

/** One navigation entry of the desktop sidebar. */
export function SidebarLink({ label, active, onClick, icon }) {
  return html`
    <button type="button" class=${`sidebar__link ${active ? 'is-active' : ''}`} onClick=${onClick} aria-current=${active ? 'page' : undefined}>
      ${icon && html`<${Icon} name=${icon} />`}
      <span>${label}</span>
    </button>
  `;
}
