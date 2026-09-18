import { html, useState, useMemo, useRef, useCallback, useEffect } from '../lib/preact.js';
import { SHOW } from '../lib/schema.js';
import { toForm, fromForm, clone, isDirty, validate, normalizeForm, slugify } from '../lib/form.js';
import { prepareImage, imageFileName, blobToBase64, thumbUrl } from '../lib/images.js';
import { splitIntoBatches } from '../lib/batches.js';
import { Header } from './Header.js';
import { LanguageChips } from './LanguageChips.js';
import { EditorForm } from './EditorForm.js';
import { BottomBar } from './BottomBar.js';
import { ConfirmSheet } from './ConfirmSheet.js';
import { Sheet } from './Sheet.js';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import { LoadState } from './LoadState.js';

const LANG_KEY = 'medusa-panel-lang';
// Files the library lists (existing SVG logos included: picking one uploads nothing; new SVG uploads are refused by images.js and the server).
const LIBRARY_EXTENSIONS = /\.(webp|jpe?g|png|gif|avif|svg)$/i;
const LIBRARY_MAX_BYTES = 6 * 1024 * 1024;

/** Repo folder and public folder for a photo field. */
function foldersFor(field) {
  if (field.mediaFolder === '..') return { repo: 'src/assets', publicBase: '/assets' };
  if (field.mediaFolder) return { repo: `src/assets/images/${field.mediaFolder}`, publicBase: `/assets/images/${field.mediaFolder}` };
  return { repo: 'src/assets/images', publicBase: '/assets/images' };
}

/** Edits one section file or one show: form, photos, validation, save & publish, delete. */
export function EditorScreen({ kind, section, slug, content, loadError, onReload, backend, publish, updateCache, go, back, registerGuard, askReauth }) {
  const isShow = kind === 'show';
  const isNew = isShow && !slug;
  const fields = isShow ? SHOW.fields : section.fields;
  const record = isShow ? content?.shows.find((s) => s.slug === slug) : content?.sections[section.id];
  const initial = useMemo(() => toForm(fields, record ?? { en: {}, es: {} }), [fields, record]);
  const [form, setForm] = useState(() => clone(initial));
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'both');
  const [confirm, setConfirm] = useState(null);
  const [leaveTo, setLeaveTo] = useState(null);
  const [problems, setProblems] = useState(null);
  const [saving, setSaving] = useState(false);
  const uploadsRef = useRef(new Map());
  const dirtyRef = useRef(false);
  const [, bump] = useState(0);

  useEffect(() => { setForm(clone(initial)); }, [initial]);

  const dirty = isDirty(form, initial);
  dirtyRef.current = dirty;

  useEffect(() => {
    registerGuard({ isDirty: () => dirtyRef.current, askToLeave: (next) => { setLeaveTo(next); setConfirm('discard'); } });
    return () => registerGuard(null);
  }, [registerGuard]);

  useEffect(() => {
    function onBeforeUnloadHandler(event) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', onBeforeUnloadHandler);
  }, [dirty]);

  const media = useMemo(() => ({
    reauth: askReauth,
    previewUrl(path, size = 'large') {
      if (!path) return '';
      const pending = uploadsRef.current.get(path)?.previewUrl;
      if (pending) return pending;
      return size === 'thumb' ? path : thumbUrl(path, 1200);
    },
    isPending(path) {
      return uploadsRef.current.has(path);
    },
    async upload(field, file) {
      const { blob, ext } = await prepareImage(file);
      const folders = foldersFor(field);
      const name = imageFileName(file.name, ext);
      const publicPath = `${folders.publicBase}/${name}`;
      uploadsRef.current.set(publicPath, { repoPath: `${folders.repo}/${name}`, blob, previewUrl: URL.createObjectURL(blob) });
      bump((n) => n + 1);
      return publicPath;
    },
    async library(field) {
      const folders = foldersFor(field);
      const files = await backend.listDir(folders.repo);
      return files
        .filter((f) => LIBRARY_EXTENSIONS.test(f.name) && !(f.size > LIBRARY_MAX_BYTES))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ name: f.name, publicPath: `${folders.publicBase}/${f.name}` }));
    },
  }), [backend, askReauth]);

  const onLangHandler = useCallback((value) => {
    setLang(value);
    localStorage.setItem(LANG_KEY, value);
  }, []);

  const title = isShow ? (isNew ? 'Nuevo show' : form.name?.es || form.name?.en || slug) : section.title;
  const previewHref = isShow ? (isNew ? null : `/${SHOW.preview(slug)}`) : `/${section.preview}`;

  function onBackHandler() {
    if (dirty) {
      setLeaveTo(null);
      setConfirm('discard');
    } else back();
  }

  function discardAndLeave() {
    dirtyRef.current = false;
    setConfirm(null);
    setForm(clone(initial));
    uploadsRef.current.clear();
    if (typeof leaveTo === 'function') leaveTo();
    else if (leaveTo) go(leaveTo);
    else back();
  }

  function uniqueSlug(name) {
    const base = slugify(name) || 'show';
    const taken = new Set(content.shows.map((s) => s.slug));
    let candidate = base;
    for (let i = 2; taken.has(candidate); i++) candidate = `${base}-${i}`;
    return candidate;
  }

  function duplicateNameProblem(normalized) {
    if (!isShow) return null;
    const names = [normalized.name?.en, normalized.name?.es].filter(Boolean).map((n) => n.trim().toLowerCase());
    const clash = content.shows.find((s) => s.slug !== slug && [s.en?.name, s.es?.name].filter(Boolean).some((n) => names.includes(n.trim().toLowerCase())));
    return clash ? { label: 'Nombre del show', message: `Ya existe un show llamado “${clash.es?.name || clash.en?.name}”. Elige otro nombre para no confundir a los visitantes.` } : null;
  }

  async function onSaveHandler() {
    if (saving) return;
    const normalized = normalizeForm(fields, form);
    const found = validate(fields, normalized);
    const duplicate = duplicateNameProblem(normalized);
    if (duplicate) found.unshift(duplicate);
    if (found.length) {
      setProblems(found);
      return;
    }
    setSaving(true);
    setForm(normalized);
    const data = fromForm(fields, normalized, record);
    let targetSlug = slug;
    if (isShow) {
      if (isNew) targetSlug = uniqueSlug(normalized.name.en || normalized.name.es);
      const order = isNew ? (Math.max(0, ...content.shows.map((s) => s.en.order ?? 0)) + 1) : (record?.en.order ?? 999);
      data.en.order = order;
      data.es.order = order;
    }
    const filePath = isShow ? `${SHOW.folder}/${targetSlug}.json` : section.file;
    const json = JSON.stringify(data, null, 2) + '\n';
    const uploads = [];
    for (const [publicPath, upload] of uploadsRef.current) {
      if (json.includes(publicPath)) uploads.push({ path: upload.repoPath, base64: await blobToBase64(upload.blob) });
    }
    let batches;
    try {
      batches = splitIntoBatches(uploads, [{ path: filePath, content: json }]);
    } catch (error) {
      setSaving(false);
      setProblems([{ label: 'Fotos', message: error.message }]);
      return;
    }
    setSaving(false);
    const label = isShow ? `Show · ${normalized.name?.es || normalized.name?.en}` : section.title;
    publish({
      label,
      message: isNew ? `feat: cms — nuevo show "${targetSlug}"` : `chore: cms — actualiza ${isShow ? `show "${targetSlug}"` : section.title.toLowerCase()}`,
      batches,
      href: isShow ? `/${SHOW.preview(targetSlug)}` : `/${section.preview}`,
      apply: () => {
        uploadsRef.current.clear();
        dirtyRef.current = false;
        updateCache((cache) => {
          if (!isShow) return { ...cache, sections: { ...cache.sections, [section.id]: data } };
          const shows = isNew ? [...cache.shows, { slug: targetSlug, ...data }] : cache.shows.map((s) => (s.slug === targetSlug ? { slug: targetSlug, ...data } : s));
          return { ...cache, shows };
        });
      },
      afterPublish: isNew ? () => go({ name: 'show', slug: targetSlug }) : null,
    });
  }

  function onDeleteHandler() {
    setConfirm(null);
    dirtyRef.current = false;
    const files = [];
    const packages = content.sections.packages;
    const unlinkPackages = (locale) => ({ ...locale, items: (locale.items ?? []).map((item) => ({ ...item, includes: (item.includes ?? []).map((inc) => (inc.show === slug ? { ...inc, show: '' } : inc)) })) });
    const packagesLinked = (packages?.en?.items ?? []).some((item) => (item.includes ?? []).some((inc) => inc.show === slug));
    const newPackages = packagesLinked ? { en: unlinkPackages(packages.en), es: unlinkPackages(packages.es ?? {}) } : packages;
    if (packagesLinked) files.push({ path: 'content/home/packages.json', content: JSON.stringify(newPackages, null, 2) + '\n' });
    const newShows = content.shows.filter((s) => s.slug !== slug).map((s) => {
      if (!(s.en.related ?? []).includes(slug)) return s;
      const next = { slug: s.slug, en: { ...s.en, related: s.en.related.filter((r) => r !== slug) }, es: { ...s.es, related: (s.es.related ?? s.en.related).filter((r) => r !== slug) } };
      files.push({ path: `${SHOW.folder}/${s.slug}.json`, content: JSON.stringify({ en: next.en, es: next.es }, null, 2) + '\n' });
      return next;
    });
    publish({
      label: `Eliminar show · ${form.name?.es || form.name?.en}`,
      message: `chore: cms — elimina show "${slug}"`,
      files,
      deletions: [`${SHOW.folder}/${slug}.json`],
      apply: () => updateCache((cache) => ({ ...cache, shows: newShows, sections: { ...cache.sections, packages: newPackages } })),
      afterPublish: () => go({ name: 'shows' }),
    });
  }

  if (!content) {
    return html`
      <div class="editor">
        <${Header} title=${isShow ? 'Show' : section.title} kicker=${isShow ? 'Show' : section.kicker} onBack=${back} />
        <${LoadState} error=${loadError} onReload=${onReload} />
      </div>
    `;
  }
  if (isShow && !isNew && !record) {
    return html`
      <div class="editor">
        <${Header} title="Show no encontrado" onBack=${back} />
        <p class="notice">Este show ya no existe. Vuelve a la lista.</p>
      </div>
    `;
  }

  return html`
    <div class="editor">
      <${Header} title=${title} kicker=${isShow ? 'Show' : section.kicker} onBack=${onBackHandler} previewHref=${previewHref} />
      <div class="editor__intro">
        ${!isShow && html`<p class="editor__text">${section.description}</p>`}
        <${LanguageChips} value=${lang} onChange=${onLangHandler} />
      </div>
      <${EditorForm} fields=${fields} value=${form} onChange=${setForm} media=${media} lang=${lang} shows=${content.shows} currentSlug=${slug} />
      ${isShow && !isNew && html`
        <div class="danger-zone">
          <${Button} variant="ghost-danger" icon="trash" onClick=${() => setConfirm('delete')}>Eliminar este show<//>
          <p class="field__hint">Se quita de toda la web: menú, portada, paquetes y shows relacionados.</p>
        </div>
      `}
      <div class="editor__spacer" />
      <${BottomBar} visible=${dirty} busy=${saving} onSave=${onSaveHandler} onDiscard=${() => { setLeaveTo(null); setConfirm('discard'); }} label=${isNew ? 'Crear y publicar' : 'Guardar y publicar'} />
      <${ConfirmSheet}
        open=${confirm === 'discard'}
        title="¿Salir sin guardar?"
        text="Los cambios que hiciste en esta pantalla se perderán."
        confirmLabel="Descartar cambios"
        danger
        onConfirm=${discardAndLeave}
        onCancel=${() => { setConfirm(null); setLeaveTo(null); }}
      />
      <${ConfirmSheet}
        open=${confirm === 'delete'}
        title="¿Eliminar este show?"
        text="Desaparece su página y se quita del menú, de la portada, de los paquetes que lo incluyan y de los shows relacionados. Si te arrepientes, quien administra la web puede recuperarlo del historial."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        danger
        onConfirm=${onDeleteHandler}
        onCancel=${() => setConfirm(null)}
      />
      <${Sheet} open=${!!problems} title="Antes de guardar" onClose=${() => setProblems(null)}>
        <p class="sheet__text">Revisa estos puntos:</p>
        <ul class="problems">
          ${(problems || []).map((p) => html`<li><${Icon} name="warning" /><span><strong>${p.label}</strong> · ${p.message}</span></li>`)}
        </ul>
        <div class="sheet__actions"><${Button} variant="primary" onClick=${() => setProblems(null)}>Entendido<//></div>
      <//>
    </div>
  `;
}
