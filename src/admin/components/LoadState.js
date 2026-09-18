import { html } from '../lib/preact.js';
import { Skeleton } from './Skeleton.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';

/** What a screen shows while the content is still loading, or when loading failed (with a retry). */
export function LoadState({ error, onReload }) {
  if (error) {
    return html`
      <div class="notice notice--error">
        <${Icon} name="warning" />
        <span>${error}</span>
        <${Button} variant="ghost" icon="refresh" onClick=${onReload}>Reintentar<//>
      </div>
    `;
  }
  return html`<${Skeleton} card lines=${4} />`;
}
