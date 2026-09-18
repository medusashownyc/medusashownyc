import { html } from '../lib/preact.js';
import { Icon } from './Icon.js';
import { Thumb } from './Thumb.js';

/** Photo-first preview of a section, so each card looks like the part of the site it edits. */
export function Miniature({ section, data, shows = [] }) {
  const en = data?.en ?? {};
  if (section.id === 'hero') {
    return html`<div class="mini mini--hero"><span>${en.line1 || 'Rhythm'}</span><span>${en.line2 || 'Energy'}</span><span>${en.line3 || 'Spectacle'}</span></div>`;
  }
  if (section.id === 'gallery') {
    const images = (en.images ?? []).slice(0, 4);
    return html`<div class="mini mini--grid">${images.map((img) => html`<${Thumb} src=${img.image} width=${320} />`)}</div>`;
  }
  if (section.id === 'about') {
    return html`<div class="mini mini--photo"><${Thumb} src=${en.image} width=${320} /><span class="mini__badge">${en.badge_number || ''}</span></div>`;
  }
  if (section.id === 'packages') {
    const first = (en.items ?? [])[0];
    return html`<div class="mini mini--photo mini--accent" style=${`--accent: var(--${first?.accent || 'green'})`}><${Thumb} src=${first?.image} width=${320} /><span class="mini__caption">${first?.title || ''}</span></div>`;
  }
  if (section.id === 'clients') {
    const photos = (en.photos ?? []).slice(0, 3);
    return html`<div class="mini mini--strip">${photos.map((p) => html`<${Thumb} src=${p.image} width=${320} />`)}</div>`;
  }
  if (section.id === 'contact') {
    return html`<div class="mini mini--icon mini--green"><${Icon} name="calendar" /><span>${en.cal_duration || '15 min'}</span></div>`;
  }
  if (section.id === 'shows') {
    return html`<div class="mini mini--strip">${shows.slice(0, 4).map((s) => html`<${Thumb} src=${s.en.cover} width=${320} style=${s.en.crop === 'top' ? 'object-position: 50% 0%' : ''} />`)}</div>`;
  }
  if (section.id === 'settings') return html`<div class="mini mini--icon"><${Icon} name="settings" /></div>`;
  return html`<div class="mini mini--icon"><${Icon} name="text" /></div>`;
}
