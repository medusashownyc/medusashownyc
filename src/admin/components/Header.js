import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';

/** Screen header: back button, kicker + title, optional "Ver en la web" link. */
export function Header({ title, kicker, onBack, previewHref, right }) {
  return html`
    <header class="header">
      <button class="header__back" type="button" onClick=${onBack} aria-label="Volver">
        <${Icon} name="back" />
      </button>
      <div class="header__titles">
        ${kicker && html`<p class="eyebrow">${kicker}</p>`}
        <h1 class="header__title">${title}</h1>
      </div>
      ${previewHref && html`<a class="header__action" href=${previewHref} target="_blank" rel="noopener" aria-label="Ver en la web"><${Icon} name="external" /><span>Ver</span></a>`}
      ${right}
    </header>
  `;
}
