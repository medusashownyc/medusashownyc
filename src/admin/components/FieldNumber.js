import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';

/** Whole-number field with big − / + buttons for touch. */
export function FieldNumber({ field, value, onChange, path }) {
  const id = `f-${path}`;
  const min = field.min ?? -Infinity;
  const current = Number(value) || 0;
  return html`
    <div class="field">
      <label class="field__label" for=${id}>${field.label}</label>
      <div class="stepper">
        <button type="button" class="stepper__btn" onClick=${() => onChange(Math.max(min, current - 1))} aria-label="Menos"><span>−</span></button>
        <input id=${id} class="input stepper__input" type="number" inputMode="numeric" min=${field.min} value=${current} onInput=${(e) => onChange(Math.max(min, Number(e.target.value) || 0))} />
        <button type="button" class="stepper__btn" onClick=${() => onChange(current + 1)} aria-label="Más"><${Icon} name="plus" /></button>
      </div>
      ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
    </div>
  `;
}
