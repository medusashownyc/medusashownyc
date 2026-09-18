import { html, useState, useEffect, useRef } from '../lib/preact.js';
import { SHOW } from '../lib/schema.js';
import { Header } from './Header.js';
import { Button } from './Button.js';
import { BottomBar } from './BottomBar.js';
import { Icon } from './Icon.js';
import { LoadState } from './LoadState.js';
import { Thumb } from './Thumb.js';
import { ConfirmSheet } from './ConfirmSheet.js';

/** All shows in menu order: open one to edit it, move them up or down, or add a new one. */
export function ShowsScreen({ content, loadError, onReload, publish, updateCache, go, back, registerGuard }) {
  const [order, setOrder] = useState(() => (content?.shows ?? []).map((s) => s.slug));
  const [leaving, setLeaving] = useState(null);
  const dirtyRef = useRef(false);
  useEffect(() => { setOrder((content?.shows ?? []).map((s) => s.slug)); }, [content]);

  const dirty = !!content && order.join() !== content.shows.map((s) => s.slug).join();
  dirtyRef.current = dirty;

  useEffect(() => {
    registerGuard({ isDirty: () => dirtyRef.current, askToLeave: (next) => setLeaving(next) });
    return () => registerGuard(null);
  }, [registerGuard]);

  if (!content) {
    return html`
      <div class="editor">
        <${Header} title="Shows" onBack=${back} />
        <${LoadState} error=${loadError} onReload=${onReload} />
      </div>
    `;
  }
  const bySlug = Object.fromEntries(content.shows.map((s) => [s.slug, s]));

  function discardAndLeave(next) {
    dirtyRef.current = false;
    setOrder(content.shows.map((s) => s.slug));
    setLeaving(null);
    if (typeof next === 'function') next();
    else if (next) go(next);
    else back();
  }

  function onBackHandler() {
    if (dirty) setLeaving({ name: 'home' });
    else back();
  }

  function move(index, delta) {
    const next = [...order];
    const [slug] = next.splice(index, 1);
    next.splice(index + delta, 0, slug);
    setOrder(next);
  }

  function onSaveOrderHandler() {
    const files = [];
    const updated = order.map((slug, i) => {
      const show = bySlug[slug];
      const data = { en: { ...show.en, order: i + 1 }, es: { ...show.es, order: i + 1 } };
      if (show.en.order !== i + 1) files.push({ path: `${SHOW.folder}/${slug}.json`, content: JSON.stringify(data, null, 2) + '\n' });
      return { slug, ...data };
    });
    publish({
      label: 'Orden de los shows',
      message: 'chore: cms — reordena los shows',
      files,
      href: '/index.html',
      apply: () => updateCache((cache) => ({ ...cache, shows: updated })),
    });
  }

  return html`
    <div class="editor">
      <${Header} title="Shows" kicker=${`${order.length} en la web`} onBack=${onBackHandler} previewHref="/index.html" />
      <p class="editor__text">Este es el orden del menú y del carrusel de la portada. Toca un show para editarlo.</p>
      <div class="shows">
        ${order.map((slug, index) => {
          const show = bySlug[slug];
          if (!show) return null;
          return html`
            <div class="show" key=${slug} style=${`--accent: var(--${show.en.accent || 'green'})`}>
              <button type="button" class="show__main" onClick=${() => go({ name: 'show', slug })}>
                <${Thumb} class="show__cover" src=${show.en.cover} width=${320} style=${show.en.crop === 'top' ? 'object-position: 50% 0%' : ''} />
                <span class="show__text">
                  <span class="show__name">${show.es?.name || show.en?.name || slug}</span>
                  <span class="show__meta">${show.en.dark ? 'Fondo oscuro · ' : ''}${(show.en.features ?? []).length} elementos · ${(show.en.tags ?? []).length} ocasiones</span>
                </span>
                <span class="show__edit"><${Icon} name="edit" /></span>
              </button>
              <div class="show__order">
                <button type="button" class="show__arrow" disabled=${index === 0} onClick=${() => move(index, -1)} aria-label="Subir"><${Icon} name="up" /></button>
                <span class="show__num">${index + 1}</span>
                <button type="button" class="show__arrow" disabled=${index === order.length - 1} onClick=${() => move(index, 1)} aria-label="Bajar"><${Icon} name="down" /></button>
              </div>
            </div>
          `;
        })}
      </div>
      <${Button} variant="dashed" icon="plus" onClick=${() => go({ name: 'new-show' })}>Añadir un show<//>
      <div class="editor__spacer" />
      <${BottomBar} visible=${dirty} onSave=${onSaveOrderHandler} onDiscard=${() => setOrder(content.shows.map((s) => s.slug))} label="Guardar el orden" />
      <${ConfirmSheet}
        open=${!!leaving}
        title="¿Salir sin guardar el orden?"
        text="El nuevo orden de los shows se perderá."
        confirmLabel="Descartar cambios"
        danger
        onConfirm=${() => discardAndLeave(leaving)}
        onCancel=${() => setLeaving(null)}
      />
    </div>
  `;
}
