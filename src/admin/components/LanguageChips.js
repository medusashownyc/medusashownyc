import { html } from '../lib/preact.js';
import { flags } from '../lib/icons.js';

const OPTIONS = [
  { value: 'both', label: 'Ambos idiomas' },
  { value: 'es', label: 'Español', flag: 'es' },
  { value: 'en', label: 'English', flag: 'en' },
];

/** Chooses which language columns the editor shows (the site is bilingual). */
export function LanguageChips({ value, onChange }) {
  return html`
    <div class="chips" role="radiogroup" aria-label="Idioma que estás editando">
      ${OPTIONS.map((option) => html`
        <button
          type="button"
          role="radio"
          aria-checked=${value === option.value}
          class=${`chip ${value === option.value ? 'is-active' : ''}`}
          onClick=${() => onChange(option.value)}
        >
          ${option.flag && html`<span class="flag" dangerouslySetInnerHTML=${{ __html: flags[option.flag] }} />`}
          ${option.label}
        </button>
      `)}
    </div>
  `;
}
