import { html } from '../lib/preact.js';
import { flags } from '../lib/icons.js';
import { TextInput } from './TextInput.js';

const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

/** Text field. Translatable fields show one input per language, filtered by the language chips. */
export function FieldText({ field, value, onChange, lang = 'both', path }) {
  const id = `f-${path}`;
  if (!field.i18n) {
    return html`
      <div class=${`field ${field.type === 'textarea' ? 'field--wide' : ''}`}>
        <label class="field__label" for=${id}>${field.label}</label>
        <${TextInput} id=${id} field=${field} value=${value} onChange=${onChange} />
        ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
      </div>
    `;
  }
  const current = value ?? { en: '', es: '' };
  const visible = LANGS.filter((l) => lang === 'both' || l.code === lang);
  const missing = LANGS.filter((l) => !current[l.code] && current[l.code === 'es' ? 'en' : 'es']);
  return html`
    <div class="field field--wide">
      <p class="field__label">${field.label}</p>
      <div class=${`field__langs ${lang === 'both' ? 'field__langs--pair' : ''}`}>
        ${visible.map((l) => html`
          <div class="field__lang" key=${l.code}>
            <label class="field__flag" for=${`${id}-${l.code}`}><span class="flag" dangerouslySetInnerHTML=${{ __html: flags[l.code] }} />${l.label}</label>
            <${TextInput} id=${`${id}-${l.code}`} field=${field} value=${current[l.code]} onChange=${(v) => onChange({ ...current, [l.code]: v })} placeholder=${l.code === 'es' ? current.en : current.es} />
          </div>
        `)}
      </div>
      ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
      ${missing.length > 0 && html`<p class="field__hint field__hint--warn">Falta la versión en ${missing.map((l) => l.label).join(' y ')}; mientras tanto la web muestra el otro idioma.</p>`}
    </div>
  `;
}
