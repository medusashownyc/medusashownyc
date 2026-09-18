import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';
import { Thumb } from './Thumb.js';

/** Link to one show (dropdown) or to several (checkable list with covers). */
export function FieldRelation({ field, value, onChange, shows = [], path, currentSlug }) {
  const id = `f-${path}`;
  const options = shows.filter((s) => s.slug !== currentSlug);
  if (field.type === 'show') {
    const known = !value || options.some((s) => s.slug === value);
    return html`
      <div class="field">
        <label class="field__label" for=${id}>${field.label}</label>
        <select id=${id} class="input select" value=${known ? value || '' : ''} onChange=${(e) => onChange(e.target.value)}>
          <option value="">${known ? 'Sin enlace' : 'Sin enlace (el show enlazado ya no existe)'}</option>
          ${options.map((s) => html`<option value=${s.slug}>${s.es?.name || s.en?.name || s.slug}</option>`)}
        </select>
        ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
      </div>
    `;
  }
  const selected = Array.isArray(value) ? value : [];
  const full = field.max && selected.length >= field.max;
  function toggleSelection(slug) {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (!full) onChange([...selected, slug]);
  }
  return html`
    <div class="field field--wide">
      <p class="field__label">${field.label}</p>
      <div class="picklist">
        ${options.map((s) => {
          const active = selected.includes(s.slug);
          return html`
            <button type="button" role="checkbox" aria-checked=${active} class=${`picklist__item ${active ? 'is-active' : ''}`} disabled=${!active && full} onClick=${() => toggleSelection(s.slug)}>
              <${Thumb} src=${s.en?.cover} width=${320} style=${s.en?.crop === 'top' ? 'object-position: 50% 0%' : ''} />
              <span>${s.es?.name || s.en?.name || s.slug}</span>
              <span class="picklist__check"><${Icon} name="check" /></span>
            </button>
          `;
        })}
      </div>
      ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
    </div>
  `;
}
