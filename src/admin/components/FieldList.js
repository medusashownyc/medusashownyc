import { html, useState } from '../lib/preact.js';
import { emptyItem, itemSummary, itemThumb, capitalize } from '../lib/form.js';
import { EditorForm } from './EditorForm.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import { Thumb } from './Thumb.js';

/** Repeatable group (packages, testimonials, photos…): cards you can open, reorder, add and remove. */
export function FieldList({ field, value, onChange, media, lang, shows, path, currentSlug }) {
  const items = Array.isArray(value) ? value : [];
  const [openIndex, setOpenIndex] = useState(items.length === 1 ? 0 : -1);
  const atMax = field.max && items.length >= field.max;
  const atMin = field.min && items.length <= field.min;
  const singular = field.labelSingular || 'elemento';

  function update(index, item) {
    onChange(items.map((it, i) => (i === index ? item : it)));
  }
  function move(index, delta) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
    setOpenIndex(index + delta);
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
    setOpenIndex(-1);
  }
  function add() {
    onChange([...items, emptyItem(field.fields)]);
    setOpenIndex(items.length);
  }

  return html`
    <div class="field field--wide">
      <div class="field__head">
        <p class="field__label">${field.label} <span class="count">${items.length}</span></p>
        ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
      </div>
      <div class="list">
        ${items.map((item, index) => {
          const isOpen = openIndex === index;
          const thumb = media.previewUrl(itemThumb(field, item), 'thumb');
          return html`
            <div class=${`item ${isOpen ? 'is-open' : ''}`} key=${index}>
              <button type="button" class="item__head" onClick=${() => setOpenIndex(isOpen ? -1 : index)} aria-expanded=${isOpen}>
                ${thumb ? html`<${Thumb} class="item__thumb" src=${thumb} width=${320} />` : html`<span class="item__num">${index + 1}</span>`}
                <span class="item__title">${itemSummary(field, item, index)}</span>
                <span class="item__chevron"><${Icon} name=${isOpen ? 'up' : 'down'} /></span>
              </button>
              ${isOpen && html`
                <div class="item__body">
                  <${EditorForm} fields=${field.fields} value=${item} onChange=${(next) => update(index, next)} media=${media} lang=${lang} shows=${shows} path=${`${path}-${index}`} currentSlug=${currentSlug} />
                  <div class="item__actions">
                    <${Button} variant="ghost" icon="up" disabled=${index === 0} onClick=${() => move(index, -1)}>Subir<//>
                    <${Button} variant="ghost" icon="down" disabled=${index === items.length - 1} onClick=${() => move(index, 1)}>Bajar<//>
                    <${Button} variant="ghost-danger" icon="trash" disabled=${atMin} onClick=${() => remove(index)}>Quitar<//>
                  </div>
                  ${atMin && html`<p class="field__hint">Esta sección necesita al menos ${field.min} ${field.min === 1 ? singular : field.label.toLowerCase()}.</p>`}
                </div>
              `}
            </div>
          `;
        })}
      </div>
      ${!atMax && html`<${Button} variant="dashed" icon="plus" onClick=${add}>Añadir ${singular}<//>`}
      ${atMax && html`<p class="field__hint">${capitalize(field.label)}: máximo ${field.max}.</p>`}
    </div>
  `;
}
