import { html } from '../lib/preact.js';
import { icons } from '../lib/icons.js';

/** Inline icon by name (see lib/icons.js). */
export function Icon({ name, class: className = '' }) {
  return html`<span class=${`icon ${className}`} dangerouslySetInnerHTML=${{ __html: icons[name] || '' }} />`;
}
