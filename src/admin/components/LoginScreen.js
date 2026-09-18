import { html, useState, useRef, useCallback, useEffect } from '../lib/preact.js';
import { useTurnstile } from '../hooks/useTurnstile.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';

/** Sign-in with the client's email and password (the only credentials she needs). */
export function LoginScreen({ onSubmit, busy, error, turnstileSiteKey, hint, compact = false, title = 'Cambia textos y fotos sin tocar código', text = 'Entra con tu correo y tu contraseña. Cada cambio que guardes se publica solo en un minuto.' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const turnstileBox = useRef(null);
  const onTurnstileErrorHandler = useCallback(() => setTurnstileFailed(true), []);
  const resetTurnstile = useTurnstile(turnstileSiteKey, turnstileBox, setTurnstileToken, onTurnstileErrorHandler);
  useEffect(() => {
    if (error && turnstileSiteKey) resetTurnstile();
  }, [error, turnstileSiteKey, resetTurnstile]);

  function onSubmitHandler(event) {
    event.preventDefault();
    if (busy) return;
    onSubmit(email.trim().toLowerCase(), password, turnstileToken);
  }

  return html`
    <div class=${`login ${compact ? 'login--compact' : ''}`}>
      <form class="login__card" method="post" action="#" onSubmit=${onSubmitHandler}>
        ${!compact && html`<img class="login__logo" src="/assets/Logo-negro.svg" alt="Medusa Show" />`}
        <p class="eyebrow">Editar la web</p>
        <h1 class="login__title">${title}</h1>
        <p class="login__text">${text}</p>
        ${error && html`<p class="notice notice--error"><${Icon} name="warning" /> ${error}</p>`}
        <div class="login__fields">
          <label class="field__label" for="login-email">Correo</label>
          <input id="login-email" name="email" class="input" type="email" inputMode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required value=${email} onInput=${(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          <label class="field__label" for="login-password">Contraseña</label>
          <div class="password">
            <input id="login-password" name="password" class="input" type=${showPassword ? 'text' : 'password'} autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" required value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" class="password__toggle" onClick=${() => setShowPassword(!showPassword)} aria-label=${showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}><${Icon} name="eye" /></button>
          </div>
          ${turnstileSiteKey && html`<div class="login__turnstile" ref=${turnstileBox} />`}
          ${turnstileFailed && html`<p class="notice notice--error"><${Icon} name="warning" /> No se pudo cargar la verificación anti-bots. Desactiva el bloqueador de anuncios o <button type="button" class="link" onClick=${() => location.reload()}>recarga la página</button>.</p>`}
        </div>
        <${Button} variant="primary" icon="key" type="submit" busy=${busy} disabled=${!!turnstileSiteKey && !turnstileToken} class="btn--block">Entrar<//>
        <p class="field__hint">${hint || 'Si no recuerdas la contraseña, pídesela a Daniel.'}</p>
      </form>
    </div>
  `;
}
