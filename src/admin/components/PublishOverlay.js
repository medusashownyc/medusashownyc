import { html } from '../lib/preact.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';

const STEPS = [
  { id: 'saving', label: 'Guardando los cambios' },
  { id: 'publishing', label: 'Publicando en la web' },
  { id: 'done', label: 'Ya está en la web' },
];

/** Full-screen "telón" shown while a change is saved and published. */
export function PublishOverlay({ state, onDone, onRetry, onContinue }) {
  const current = STEPS.findIndex((s) => s.id === state.step);
  const finished = state.step === 'done' || state.step === 'slow';
  return html`
    <div class=${`curtain curtain--${state.step}`} role="dialog" aria-modal="true" aria-live="polite">
      <div class="curtain__bar" aria-hidden="true" />
      <div class="curtain__body">
        ${state.step === 'error' ? html`
          <div class="curtain__mark curtain__mark--error"><${Icon} name="warning" /></div>
          <h2 class="curtain__title">No se pudo guardar</h2>
          <p class="curtain__text">${state.error}</p>
          <div class="curtain__actions">
            <${Button} variant="primary" icon="refresh" onClick=${onRetry}>Intentar otra vez<//>
            <${Button} variant="ghost" onClick=${onDone}>Volver a la edición<//>
          </div>
        ` : html`
          <div class=${`curtain__mark ${finished ? 'is-done' : ''}`}>
            ${finished ? html`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" /><path d="M20 33.5l8 8L45 23" /></svg>` : html`<span class="spinner spinner--big" aria-hidden="true" />`}
          </div>
          <p class="eyebrow curtain__eyebrow">${state.label}</p>
          <ol class="curtain__steps">
            ${STEPS.map((step, i) => html`
              <li class=${`curtain__step ${i < current || finished ? 'is-done' : ''} ${i === current && !finished ? 'is-current' : ''}`}>
                <span class="curtain__dot" aria-hidden="true"><${Icon} name="check" /></span>
                <span>${step.id === 'done' && state.step === 'slow' ? 'Publicándose en unos minutos' : step.label}${step.id === 'saving' && state.progress && i === current ? ` (${state.progress})` : ''}</span>
                ${step.id === 'publishing' && i === current && html`<small>Suele tardar un minuto</small>`}
              </li>
            `)}
          </ol>
          ${state.step === 'slow' && html`<p class="curtain__text">Los cambios ya están guardados. La web se actualizará sola en unos minutos.</p>`}
          ${state.step === 'publishing' && html`<div class="curtain__actions curtain__actions--soft"><${Button} variant="ghost-light" onClick=${onContinue}>Seguir editando mientras se publica<//></div>`}
          ${finished && html`
            <div class="curtain__actions">
              ${state.href && html`<${Button} variant="light" icon="external" href=${state.href} target="_blank">Ver la web<//>`}
              <${Button} variant=${state.href ? 'ghost-light' : 'light'} onClick=${onDone}>Seguir editando<//>
            </div>
          `}
        `}
      </div>
    </div>
  `;
}
