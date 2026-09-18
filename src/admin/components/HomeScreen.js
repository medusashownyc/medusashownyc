import { html } from '../lib/preact.js';
import { HOME_SECTIONS, SETTINGS_SECTIONS } from '../lib/schema.js';
import { SectionCard } from './SectionCard.js';
import { Skeleton } from './Skeleton.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';

/** Home: the site laid out as cards, top to bottom, plus shows and settings. */
export function HomeScreen({ content, user, loading, error, onReload, onLogout, go, local }) {
  const firstName = (user?.name || '').split(' ')[0] || (user?.email || '').split('@')[0];
  const showsSection = { id: 'shows', title: 'Shows', kicker: `${content?.shows?.length ?? ''} shows en la web`, description: 'Cada show tiene su página: fotos, textos, datos y orden en el menú.' };
  let index = 0;
  return html`
    <div class="home">
      <header class="home__head">
        <img class="home__symbol" src="/assets/logo.png" alt="" aria-hidden="true" />
        <div>
          <p class="eyebrow">Editar la web</p>
          <h1 class="home__title">Hola${firstName ? `, ${firstName}` : ''}</h1>
          <p class="home__text">Toca lo que quieras cambiar. Cada guardado se publica solo.</p>
        </div>
        <button class="home__logout" type="button" onClick=${onLogout} aria-label="Salir"><${Icon} name="logout" /></button>
      </header>

      ${local && html`<p class="notice"><${Icon} name="edit" /> Modo local: los cambios se guardan en tu carpeta del proyecto.</p>`}
      ${error && html`
        <div class="notice notice--error">
          <${Icon} name="warning" />
          <span>${error}</span>
          <${Button} variant="ghost" icon="refresh" onClick=${onReload}>Reintentar<//>
        </div>
      `}

      <section class="home__group">
        <p class="eyebrow home__eyebrow">Página de inicio · de arriba abajo</p>
        ${loading && html`<${Skeleton} card lines=${3} /><${Skeleton} card lines=${3} />`}
        ${content && HOME_SECTIONS.map((section) => html`
          <${SectionCard} key=${section.id} section=${section} data=${content.sections[section.id]} index=${index++} onClick=${() => go({ name: 'section', id: section.id })} />
        `)}
      </section>

      ${content && html`
        <section class="home__group">
          <p class="eyebrow home__eyebrow">Shows</p>
          <${SectionCard} section=${showsSection} shows=${content.shows} index=${index++} onClick=${() => go({ name: 'shows' })} />
        </section>

        <section class="home__group">
          <p class="eyebrow home__eyebrow">Ajustes</p>
          ${SETTINGS_SECTIONS.map((section) => html`
            <${SectionCard} key=${section.id} section=${section} data=${content.sections[section.id]} index=${index++} compact onClick=${() => go({ name: 'section', id: section.id })} />
          `)}
        </section>

        <footer class="home__foot">
          <a class="link" href="/" target="_blank" rel="noopener"><${Icon} name="external" /> Ver la web</a>
        </footer>
      `}
    </div>
  `;
}
