import fs from 'node:fs';
import path from 'node:path';
import { safeJson } from './safe-json.js';

const CONTENT_DIR = path.resolve('content');
const ICONS_FILE = path.resolve('src/_includes/icons.json');
const LOCALES = ['en', 'es'];

/** Reads a JSON file written by the CMS ({ en: {...}, es: {...} }) and fills missing Spanish fields with English ones. */
function readLocalized(file) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`No se pudo leer ${path.relative(process.cwd(), file)}: ${error.message}`);
  }
  const enRaw = raw.en ?? raw;
  const esRaw = raw.es ?? {};
  return { en: mergeLocale(esRaw, enRaw), es: mergeLocale(enRaw, esRaw) };
}

/** Returns `es` with every field missing (or empty) in it copied from `en`, recursing into objects and index-aligned lists. Used both ways, so whichever language the editor fills in shows up in the other one too. */
function mergeLocale(en, es) {
  if (Array.isArray(en)) {
    const list = Array.isArray(es) ? es : [];
    return en.map((item, i) => mergeLocale(item, list[i]));
  }
  if (en && typeof en === 'object') {
    const out = {};
    for (const key of Object.keys(en)) out[key] = mergeLocale(en[key], es?.[key]);
    return out;
  }
  return es === undefined || es === null || es === '' ? en : es;
}

/** Converts a 1-based index to a Roman numeral (I, II, III…) for the package numerals. */
export function roman(n) {
  const table = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let value = Number(n) || 0;
  let out = '';
  for (const [num, sym] of table) while (value >= num) { out += sym; value -= num; }
  return out;
}

/** Wraps an icon's inner markup (from icons.json) in the site's standard 24×24 outline <svg>. */
export function iconSvg(icons, name, strokeWidth = '1.6') {
  const inner = icons[name];
  if (!inner) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

/** Loads every CMS content file into one object: settings, strings, home sections and the ordered list of shows with related shows resolved. */
export function loadContent() {
  const icons = JSON.parse(fs.readFileSync(ICONS_FILE, 'utf8'));
  const settings = readLocalized(path.join(CONTENT_DIR, 'settings.json'));
  const strings = readLocalized(path.join(CONTENT_DIR, 'strings.json'));
  const home = {};
  for (const file of fs.readdirSync(path.join(CONTENT_DIR, 'home'))) {
    if (!file.endsWith('.json')) continue;
    home[file.replace(/\.json$/, '')] = readLocalized(path.join(CONTENT_DIR, 'home', file));
  }
  const shows = fs.readdirSync(path.join(CONTENT_DIR, 'shows'))
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({ slug: file.replace(/\.json$/, ''), ...readLocalized(path.join(CONTENT_DIR, 'shows', file)) }))
    .sort((a, b) => (a.en.order ?? 999) - (b.en.order ?? 999) || a.slug.localeCompare(b.slug));
  const bySlug = Object.fromEntries(shows.map((show) => [show.slug, show]));
  for (const show of shows) {
    show.url = `show-${show.slug}.html`;
    const picked = (show.en.related ?? []).map((slug) => bySlug[slug]).filter((s) => s && s.slug !== show.slug);
    const fallback = shows.filter((s) => s.slug !== show.slug && !picked.includes(s));
    show.relatedShows = [...picked, ...fallback].slice(0, 3);
  }
  const packages = home.packages ?? { en: { items: [] }, es: { items: [] } };
  (packages.en.items ?? []).forEach((item, i) => {
    item.numeral = roman(i + 1);
    item.includesJson = safeJson((item.includes ?? []).map((inc, j) => {
      const show = inc.show ? bySlug[inc.show] : null;
      return {
        en: inc.label,
        es: packages.es.items?.[i]?.includes?.[j]?.label ?? inc.label,
        href: show ? show.url : '',
        icon: show ? iconSvg(icons, show.en.icon) : '',
      };
    }));
  });
  const gallery = home.gallery ?? { en: { images: [] }, es: { images: [] } };
  const galleryJson = safeJson((gallery.en.images ?? []).map((item, i) => ({
    src: item.image,
    alt: item.alt ?? '',
    altEs: gallery.es.images?.[i]?.alt ?? item.alt ?? '',
    big: !!item.big,
  })));
  const build = { commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local', builtAt: new Date().toISOString() };
  return { settings, strings, home, shows, bySlug, galleryJson, icons, build, locales: LOCALES };
}
