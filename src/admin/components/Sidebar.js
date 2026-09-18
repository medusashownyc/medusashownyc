import { html } from '../lib/preact.js';
import { HOME_SECTIONS, SETTINGS_SECTIONS } from '../lib/schema.js';
import { Icon } from './Icon.js';
import { SidebarLink } from './SidebarLink.js';

/** Desktop-only navigation: every section always one click away, plus site link and sign-out. */
export function Sidebar({ route, content, go, onLogout, user }) {
  const isSection = (id) => route.name === 'section' && route.id === id;
  return html`
    <aside class="sidebar">
      <button type="button" class="sidebar__brand" onClick=${() => go({ name: 'home' })}>
        <img src="/assets/Logo-negro.svg" alt="Medusa Show" />
        <span class="eyebrow">Editar la web</span>
      </button>
      <nav class="sidebar__nav" aria-label="Secciones del panel">
        <${SidebarLink} label="Inicio" icon="sparkle" active=${route.name === 'home'} onClick=${() => go({ name: 'home' })} />
        <h2 class="eyebrow sidebar__group">Página de inicio</h2>
        ${HOME_SECTIONS.map((section) => html`<${SidebarLink} key=${section.id} label=${section.title} active=${isSection(section.id)} onClick=${() => go({ name: 'section', id: section.id })} />`)}
        <h2 class="eyebrow sidebar__group">Shows</h2>
        <${SidebarLink} label=${`Todos los shows${content ? ` (${content.shows.length})` : ''}`} active=${route.name === 'shows' || route.name === 'show'} onClick=${() => go({ name: 'shows' })} />
        <${SidebarLink} label="Nuevo show" icon="plus" active=${route.name === 'new-show'} onClick=${() => go({ name: 'new-show' })} />
        <h2 class="eyebrow sidebar__group">Ajustes</h2>
        ${SETTINGS_SECTIONS.map((section) => html`<${SidebarLink} key=${section.id} label=${section.title} active=${isSection(section.id)} onClick=${() => go({ name: 'section', id: section.id })} />`)}
      </nav>
      <div class="sidebar__foot">
        <a class="sidebar__link" href="/" target="_blank" rel="noopener"><${Icon} name="external" /><span>Ver la web</span></a>
        <button type="button" class="sidebar__link" onClick=${onLogout}><${Icon} name="logout" /><span>Salir${user?.email ? ` · ${user.email}` : ''}</span></button>
      </div>
    </aside>
  `;
}
