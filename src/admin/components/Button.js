import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';

/** The panel's button: variants primary (black pill), secondary (outline), ghost, danger. */
export function Button({ variant = 'secondary', icon, children, busy = false, disabled = false, onClick, type = 'button', class: className = '', href, target }) {
  const classes = `btn btn--${variant} ${busy ? 'is-busy' : ''} ${className}`;
  const inner = html`${busy ? html`<span class="spinner" aria-hidden="true" />` : icon && html`<${Icon} name=${icon} />`}<span>${children}</span>`;
  if (href) return html`<a class=${classes} href=${href} target=${target} rel=${target === '_blank' ? 'noopener' : undefined} onClick=${onClick}>${inner}</a>`;
  return html`<button class=${classes} type=${type} disabled=${disabled || busy} onClick=${onClick}>${inner}</button>`;
}
