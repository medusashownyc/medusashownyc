import { html } from '../lib/preact.js';
import { FieldText } from './FieldText.js';
import { FieldNumber } from './FieldNumber.js';
import { FieldToggle } from './FieldToggle.js';
import { FieldSelect } from './FieldSelect.js';
import { FieldImage } from './FieldImage.js';
import { FieldRelation } from './FieldRelation.js';
import { FieldList } from './FieldList.js';

/** Renders a list of field definitions as inputs and reports the whole value back on every change. */
export function EditorForm({ fields, value, onChange, media, lang, shows, path = 'root', currentSlug }) {
  function setField(name, fieldValue) {
    onChange({ ...value, [name]: fieldValue });
  }
  return html`
    <div class="form">
      ${fields.map((field) => {
        const props = { key: field.name, field, value: value?.[field.name], onChange: (v) => setField(field.name, v), path: `${path}-${field.name}` };
        if (field.type === 'list') return html`<${FieldList} ...${props} media=${media} lang=${lang} shows=${shows} currentSlug=${currentSlug} />`;
        if (field.type === 'image') return html`<${FieldImage} ...${props} media=${media} />`;
        if (field.type === 'number') return html`<${FieldNumber} ...${props} />`;
        if (field.type === 'toggle') return html`<${FieldToggle} ...${props} />`;
        if (field.type === 'select') return html`<${FieldSelect} ...${props} />`;
        if (field.type === 'show' || field.type === 'shows') return html`<${FieldRelation} ...${props} shows=${shows} currentSlug=${currentSlug} />`;
        return html`<${FieldText} ...${props} lang=${lang} />`;
      })}
    </div>
  `;
}
