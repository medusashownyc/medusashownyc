// Medusa Show — EN/ES translation toggle.
//
// The site's HTML is authored in English (the baseline every page ships
// with); each translatable element carries its Spanish counterpart in a
// data-es* attribute right alongside it. Switching language never fetches
// anything or swaps in a different document — it just walks the already-
// present bilingual pairs and flips which half is showing. That also means
// the very first English text a visitor sees (before this module has even
// run) is already correct, not a flash of Spanish getting corrected a
// moment later.
//
// Elements needing the ATTRIBUTE (not element text) translated use a
// `data-es-<attr>` convention: data-es-alt, data-es-aria-label,
// data-es-content (for <meta content>). Plain text nodes use `data-es`
// directly on the element holding just that text.
//
// The current language is auto-detected from the browser on first visit
// (Spanish-language browsers default to Spanish, everyone else to the
// English baseline) and remembered in localStorage after that — including
// across the manual switcher — so it stays consistent site-wide as
// visitors move between pages.

const STORAGE_KEY = 'medusa-lang';

function detectLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  const browserLangs = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];
  const prefersSpanish = browserLangs.some((l) => l.toLowerCase().startsWith('es'));
  return prefersSpanish ? 'es' : 'en';
}

let currentLang = detectLang();

// Text-attribute pairs this module knows how to swap: [datasetKey for the
// Spanish value, the real attribute it controls]. `null` means plain
// element textContent rather than an attribute.
const ATTR_MAP = [
  ['es', null],
  ['esAlt', 'alt'],
  ['esAriaLabel', 'aria-label'],
  ['esContent', 'content'],
];

// Caches each element's original (English) value the first time it's
// touched, keyed by the same dataset property ATTR_MAP swaps — so
// switching back to English is exact even after several toggles, without
// re-reading the DOM as a source of truth every time.
function ensureEnglishCached(el, datasetKey, attr) {
  const cacheKey = 'orig' + datasetKey[0].toUpperCase() + datasetKey.slice(1);
  if (el.dataset[cacheKey] === undefined) {
    el.dataset[cacheKey] = attr ? (el.getAttribute(attr) ?? '') : el.textContent;
  }
  return el.dataset[cacheKey];
}

function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;

  ATTR_MAP.forEach(([datasetKey, attr]) => {
    const selector = attr ? `[data-${datasetKey.replace(/([A-Z])/g, '-$1').toLowerCase()}]` : '[data-es]';
    document.querySelectorAll(selector).forEach((el) => {
      const enValue = ensureEnglishCached(el, datasetKey, attr);
      const value = lang === 'es' ? el.dataset[datasetKey] : enValue;
      if (attr) {
        el.setAttribute(attr, value);
      } else {
        el.textContent = value;
      }
    });
  });

  updateSwitcherUI(lang);
  document.dispatchEvent(new CustomEvent('medusa:langchange', { detail: { lang } }));
}

// Flag-pill switcher (header + mobile nav): a rounded track with an EN and
// an ES option side by side, a white "highlight" sliding behind whichever
// is active. There can be more than one on a page (desktop header +
// mobile nav), so every .lang-switch found gets wired up and kept in
// sync, not just a single fixed element.
function updateSwitcherUI(lang) {
  document.querySelectorAll('.lang-switch').forEach((el) => {
    el.dataset.active = lang;
    el.querySelectorAll('.lang-switch-option').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });
  });
}

function setLang(lang) {
  if (lang !== 'en' && lang !== 'es') return;
  localStorage.setItem(STORAGE_KEY, lang);
  applyLang(lang);
}

document.querySelectorAll('.lang-switch-option').forEach((btn) => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

applyLang(currentLang);

export { currentLang as lang };
export function getLang() {
  return currentLang;
}
