import { html, useEffect, useState } from '../lib/preact.js';

let siteIconsPromise = null;

/** Loads the site's icon set (published as /admin/site-icons.json) once. */
function loadSiteIcons() {
  siteIconsPromise ??= fetch('/admin/site-icons.json').then((r) => r.json()).catch(() => ({}));
  return siteIconsPromise;
}

/** Choice field: color swatches, the site's icons, a segmented control, or a native select for long lists. */
export function FieldSelect({ field, value, onChange, path }) {
  const [siteIcons, setSiteIcons] = useState({});
  useEffect(() => {
    if (field.siteIcon) loadSiteIcons().then(setSiteIcons);
  }, [field.siteIcon]);

  const id = `f-${path}`;
  const options = field.options ?? [];
  const hasColors = options.some((o) => o.color);
  let control;
  if (hasColors) {
    control = html`
      <div class="swatches" role="radiogroup" aria-label=${field.label}>
        ${options.map((o) => html`
          <button type="button" role="radio" aria-checked=${value === o.value} class=${`swatch ${value === o.value ? 'is-active' : ''}`} style=${`--swatch: ${o.color}`} onClick=${() => onChange(o.value)}>
            <span class="swatch__dot" aria-hidden="true" /><span>${o.label}</span>
          </button>
        `)}
      </div>
    `;
  } else if (field.siteIcon) {
    control = html`
      <div class="icongrid" role="radiogroup" aria-label=${field.label}>
        ${options.map((o) => html`
          <button type="button" role="radio" aria-checked=${value === o.value} class=${`icongrid__item ${value === o.value ? 'is-active' : ''}`} onClick=${() => onChange(o.value)} title=${o.label}>
            <span class="icongrid__svg" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: siteIcons[o.value] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${siteIcons[o.value]}</svg>` : '' }} />
            <span class="icongrid__label">${o.label}</span>
          </button>
        `)}
      </div>
    `;
  } else if (options.length <= 4) {
    control = html`
      <div class="segmented" role="radiogroup" aria-label=${field.label}>
        ${options.map((o) => html`<button type="button" role="radio" aria-checked=${value === o.value} class=${`segmented__item ${value === o.value ? 'is-active' : ''}`} onClick=${() => onChange(o.value)}>${o.label}</button>`)}
      </div>
    `;
  } else {
    control = html`<select id=${id} class="input select" value=${value} onChange=${(e) => onChange(e.target.value)}>${options.map((o) => html`<option value=${o.value}>${o.label}</option>`)}</select>`;
  }
  return html`
    <div class=${`field ${field.siteIcon ? 'field--wide' : ''}`}>
      <p class="field__label" id=${`${id}-label`}>${field.label}</p>
      ${control}
      ${field.hint && html`<p class="field__hint">${field.hint}</p>`}
    </div>
  `;
}
