import { html } from '../lib/preact.js';

/** On/off switch. */
export function FieldToggle({ field, value, onChange, path }) {
  const id = `f-${path}`;
  return html`
    <div class="field field--row">
      <div>
        <label class="field__label" for=${id}>${field.label}</label>
        ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
      </div>
      <button id=${id} type="button" role="switch" aria-checked=${!!value} class=${`switch ${value ? 'is-on' : ''}`} onClick=${() => onChange(!value)}>
        <span class="switch__knob" />
      </button>
    </div>
  `;
}
