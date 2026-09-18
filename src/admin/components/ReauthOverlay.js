import { html } from '../lib/preact.js';
import { LoginScreen } from './LoginScreen.js';
import { Button } from './Button.js';

/** Sign-in on top of the current screen when the session expired mid-edit: nothing typed is lost. */
export function ReauthOverlay({ onSubmit, onCancel, busy, error, turnstileSiteKey }) {
  return html`
    <div class="reauth" role="dialog" aria-modal="true" aria-label="Vuelve a entrar">
      <div class="reauth__box">
        <${LoginScreen} compact onSubmit=${onSubmit} busy=${busy} error=${error} turnstileSiteKey=${turnstileSiteKey} title="Tu sesión caducó" text="Vuelve a entrar para guardar. Lo que has escrito sigue aquí." />
        <${Button} variant="ghost-light" onClick=${onCancel} class="reauth__cancel">Ahora no<//>
      </div>
    </div>
  `;
}
