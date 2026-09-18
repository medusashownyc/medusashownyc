import { html } from '../lib/preact.js';
import { Miniature } from './Miniature.js';
import { Icon } from './Icon.js';

/** Card for one editable section: miniature + name + what it is. */
export function SectionCard({ section, data, shows, index, onClick, compact = false }) {
  return html`
    <button type="button" class=${`card ${compact ? 'card--compact' : ''}`} style=${`--i: ${index}`} onClick=${onClick}>
      <div class="card__media"><${Miniature} section=${section} data=${data} shows=${shows} /></div>
      <div class="card__body">
        <p class="eyebrow">${section.kicker}</p>
        <h2 class="card__title">${section.title}</h2>
        <p class="card__text">${section.description}</p>
      </div>
      <span class="card__chevron"><${Icon} name="edit" /></span>
    </button>
  `;
}
