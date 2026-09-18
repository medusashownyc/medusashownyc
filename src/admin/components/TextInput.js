import { html } from '../lib/preact.js';

/** Grows a textarea to fit its content. */
function autosize(element) {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

/** One text input (single or multi-line) for a text field definition. */
export function TextInput({ id, field, value, onChange, placeholder }) {
  const common = { id, class: 'input', value: value ?? '', placeholder, autocomplete: 'off', inputMode: field.inputMode };
  if (field.type === 'textarea') {
    return html`<textarea ...${common} rows="2" ref=${(el) => el && autosize(el)} onInput=${(e) => { autosize(e.target); onChange(e.target.value); }} />`;
  }
  return html`<input ...${common} type="text" onInput=${(e) => onChange(e.target.value)} />`;
}
