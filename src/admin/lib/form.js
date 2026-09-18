// Converts between the site's content files ({ en: {...}, es: {...} }) and
// the panel's editable form shape, where every translatable text is a
// { en, es } pair and everything else is a plain value shared by both.

/** Builds the form value for a list of field definitions from a { en, es } record. */
export function toForm(fields, data) {
  const en = data?.en ?? {};
  const es = data?.es ?? {};
  const form = {};
  for (const field of fields) {
    const value = en[field.name];
    if (field.type === 'list') {
      const esList = Array.isArray(es[field.name]) ? es[field.name] : [];
      form[field.name] = (Array.isArray(value) ? value : []).map((item, i) => toForm(field.fields, { en: item, es: esList[i] }));
    } else if (field.i18n) {
      form[field.name] = { en: value ?? '', es: es[field.name] ?? '' };
    } else {
      form[field.name] = value ?? fieldDefault(field);
    }
  }
  return form;
}

/** Turns a form value back into the { en, es } record the site build reads. Fields the panel doesn't expose are kept from `original` untouched. */
export function fromForm(fields, form, original) {
  const en = { ...(original?.en ?? {}) };
  const es = { ...(original?.es ?? {}) };
  for (const field of fields) {
    const value = form[field.name];
    if (field.type === 'list') {
      const items = (value ?? []).map((item, i) => fromForm(field.fields, item, { en: original?.en?.[field.name]?.[i], es: original?.es?.[field.name]?.[i] }));
      en[field.name] = items.map((item) => item.en);
      es[field.name] = items.map((item) => item.es);
    } else if (field.i18n) {
      en[field.name] = value?.en ?? '';
      es[field.name] = value?.es ?? '';
    } else {
      en[field.name] = value;
      es[field.name] = value;
    }
  }
  return { en, es };
}

/** Default value for a single (non-list) field. */
export function fieldDefault(field) {
  if (field.default !== undefined) return field.default;
  if (field.type === 'toggle') return false;
  if (field.type === 'number') return 0;
  if (field.type === 'shows') return [];
  if (field.type === 'select') return field.options?.[0]?.value ?? '';
  return '';
}

/** A fresh, empty list item for the given subfields. */
export function emptyItem(fields) {
  const item = {};
  for (const field of fields) {
    if (field.type === 'list') item[field.name] = [];
    else if (field.i18n) item[field.name] = { en: '', es: '' };
    else item[field.name] = fieldDefault(field);
  }
  return item;
}

/** Short label for a list item, from its summary field (preferring Spanish). */
export function itemSummary(field, item, index) {
  const raw = field.summary ? item?.[field.summary] : null;
  const label = raw && typeof raw === 'object' ? raw.es || raw.en : raw;
  return (label && String(label).trim()) || `${capitalize(field.labelSingular || 'elemento')} ${index + 1}`;
}

/** First image path found in a list item (for thumbnails), if any. */
export function itemThumb(field, item) {
  return field.thumb ? item?.[field.thumb] || '' : '';
}

/** Deep-clones plain JSON data (form values contain only JSON-safe values). */
export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** True when two form values differ. */
export function isDirty(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** Applies each field's `normalize` function (e.g. trimming a pasted URL) before validating and saving. */
export function normalizeForm(fields, form) {
  const out = { ...form };
  for (const field of fields) {
    if (field.type === 'list') out[field.name] = (form[field.name] ?? []).map((item) => normalizeForm(field.fields, item));
    else if (field.normalize && typeof form[field.name] === 'string') out[field.name] = field.normalize(form[field.name]);
  }
  return out;
}

/** Validation messages for a form: [{ label, message }]. Empty when everything is fine. */
export function validate(fields, form) {
  const problems = [];
  for (const field of fields) {
    const value = form[field.name];
    if (field.type === 'list') {
      const count = (value ?? []).length;
      if (field.min && count < field.min) problems.push({ label: field.label, message: `Necesita al menos ${field.min} ${field.min === 1 ? field.labelSingular || 'elemento' : field.label.toLowerCase()}.` });
      if (field.max && count > field.max) problems.push({ label: field.label, message: `Como máximo ${field.max}.` });
      (value ?? []).forEach((item, i) => validate(field.fields, item).forEach((p) => problems.push({ label: `${field.label} · ${itemSummary(field, item, i)} · ${p.label}`, message: p.message })));
    } else if (field.i18n) {
      if (!field.optional && !(value?.en || value?.es)) problems.push({ label: field.label, message: 'Escribe el texto en al menos un idioma.' });
    } else if (field.type === 'image') {
      if (!field.optional && !value) problems.push({ label: field.label, message: 'Elige una foto.' });
    } else if (field.type === 'text') {
      if (!field.optional && !String(value ?? '').trim()) problems.push({ label: field.label, message: 'Este campo no puede quedar vacío.' });
      else if (field.pattern && value && !field.pattern.test(String(value).trim())) problems.push({ label: field.label, message: field.patternHint || 'Revisa el formato.' });
    }
  }
  return problems;
}

/** URL-safe slug (ascii, lowercase, hyphens) for file names and show pages. */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Capitalizes the first letter of a label. */
export function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
