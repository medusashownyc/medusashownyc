// Medusa Show — panel de contenido. Root of the app: session, content cache,
// hash routing between screens, publishing flow and notifications.
import { html, render, useState, useEffect, useCallback, useRef } from './lib/preact.js';
import { createBackend } from './lib/backend.js';
import { ALL_SECTIONS, SHOW } from './lib/schema.js';
import { LoginScreen } from './components/LoginScreen.js';
import { ReauthOverlay } from './components/ReauthOverlay.js';
import { Sidebar } from './components/Sidebar.js';
import { HomeScreen } from './components/HomeScreen.js';
import { ShowsScreen } from './components/ShowsScreen.js';
import { EditorScreen } from './components/EditorScreen.js';
import { PublishOverlay } from './components/PublishOverlay.js';
import { Toasts } from './components/Toasts.js';

const BUILD_POLL_MS = 4000;
const BUILD_TIMEOUT_MS = 4 * 60 * 1000;

/** Parses the URL hash into a route. */
function routeFromHash() {
  const [, kind, id] = (location.hash || '').split('/');
  if (kind === 'seccion' && ALL_SECTIONS[id]) return { name: 'section', id };
  if (kind === 'shows') return { name: 'shows' };
  if (kind === 'show' && id) return { name: 'show', slug: decodeURIComponent(id) };
  if (kind === 'nuevo-show') return { name: 'new-show' };
  return { name: 'home' };
}

/** Hash for a route (the browser's back button then works like "Volver"). */
function hashFor(route) {
  if (route.name === 'section') return `#/seccion/${route.id}`;
  if (route.name === 'shows') return '#/shows';
  if (route.name === 'show') return `#/show/${encodeURIComponent(route.slug)}`;
  if (route.name === 'new-show') return '#/nuevo-show';
  return '#/';
}

/** Reads every content file from the backend into one cache object. */
async function loadContent(backend) {
  const sectionEntries = await Promise.all(Object.values(ALL_SECTIONS).map(async (section) => [section.id, (await backend.readJson(section.file)) ?? { en: {}, es: {} }]));
  const showFiles = (await backend.listDir(SHOW.folder)).filter((f) => f.name.endsWith('.json'));
  const shows = await Promise.all(showFiles.map(async (f) => ({ slug: f.name.replace(/\.json$/, ''), ...((await backend.readJson(f.path)) ?? { en: {}, es: {} }) })));
  shows.sort((a, b) => (a.en.order ?? 999) - (b.en.order ?? 999) || a.slug.localeCompare(b.slug));
  return { sections: Object.fromEntries(sectionEntries), shows, images: null };
}

/** Reads the site's current build marker (commit + time), or null when unreachable. */
async function readBuild() {
  try {
    return await (await fetch(`/build.json?t=${Date.now()}`, { cache: 'no-store' })).json();
  } catch {
    return null;
  }
}

/** Polls /build.json until the site has been rebuilt with our final commit, or with a later one that includes it (someone pushed right after); builds of our own intermediateShas photo batches don't count. */
async function waitForBuild({ sha, kind, startedAt, before, intermediateShas = [] }) {
  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_MS));
    const build = await readBuild();
    if (!build) continue;
    if (kind === 'local') {
      if (Date.parse(build.builtAt) > startedAt) return 'done';
      continue;
    }
    if (build.commit === sha) return 'done';
    const isOurs = intermediateShas.includes(build.commit) || (before && build.commit === before.commit);
    if (!isOurs && Date.parse(build.builtAt) > startedAt) return 'done';
  }
  return 'timeout';
}

/** The whole panel. */
function App() {
  const [backend] = useState(() => createBackend());
  const [session, setSession] = useState({ status: 'checking', config: {} });
  const [user, setUser] = useState(null);
  const [content, setContent] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [route, setRoute] = useState(routeFromHash);
  const [direction, setDirection] = useState('forward');
  const [publishing, setPublishing] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [reauth, setReauth] = useState(false);
  const retryRef = useRef(null);
  const cancelRef = useRef(null);
  const publishRef = useRef(null);
  const curtainDismissedRef = useRef(false);
  const publishIdRef = useRef(0);
  const guardRef = useRef(null);
  const routeRef = useRef(route);
  const skipGuardRef = useRef(false);
  const depthRef = useRef(0);
  routeRef.current = route;

  const notify = useCallback((message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  const reload = useCallback(async () => {
    setLoadError('');
    setContent(null);
    try {
      const me = await backend.currentUser();
      setUser(me);
      setSession((current) => ({ status: 'in', config: current.config }));
      setContent(await loadContent(backend));
    } catch (error) {
      if (error.code === 'UNAUTHORIZED') {
        setSession({ status: 'out', config: error.details || {} });
        setUser(null);
        return;
      }
      setLoadError(error.message);
    }
  }, [backend]);

  const signOut = useCallback(async () => {
    if (guardRef.current?.isDirty()) {
      guardRef.current.askToLeave(() => signOut());
      return;
    }
    try {
      await backend.signOut();
    } catch (error) {
      notify(`No se pudo cerrar la sesión: sigue abierta en este dispositivo. ${error.message}`, 'error');
      return;
    }
    location.hash = '#/';
    reload();
  }, [backend, reload, notify]);

  const askReauth = useCallback(async (retry, onCancel, onFail) => {
    retryRef.current = retry;
    cancelRef.current = onCancel;
    try {
      await backend.currentUser();
      if (retry) retry();
      return;
    } catch (error) {
      if (error.code !== 'UNAUTHORIZED') {
        if (onFail) onFail(error.message);
        else notify(error.message, 'error');
        return;
      }
      setSession((current) => ({ ...current, config: error.details || current.config }));
    }
    setReauth(true);
  }, [backend, notify]);

  const onCancelReauthHandler = useCallback(() => {
    const onCancel = cancelRef.current;
    retryRef.current = null;
    cancelRef.current = null;
    setReauth(false);
    if (onCancel) onCancel();
    else notify('No se guardó. Pulsa “Guardar y publicar” cuando quieras volver a entrar.', 'error');
  }, [notify]);

  const onReauthHandler = useCallback(async (email, password, turnstile) => {
    setSigningIn(true);
    setSignInError('');
    try {
      await backend.signIn(email, password, turnstile);
      setReauth(false);
      const retry = retryRef.current;
      retryRef.current = null;
      cancelRef.current = null;
      if (retry) retry();
    } catch (error) {
      setSignInError(error.message);
    } finally {
      setSigningIn(false);
    }
  }, [backend]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    function onHashChangeHandler() {
      const next = routeFromHash();
      if (skipGuardRef.current) {
        skipGuardRef.current = false;
        return;
      }
      if (guardRef.current?.isDirty() && hashFor(next) !== hashFor(routeRef.current)) {
        skipGuardRef.current = true;
        location.hash = hashFor(routeRef.current);
        guardRef.current.askToLeave(next);
        return;
      }
      setDirection(next.name === 'home' || (routeRef.current.name !== 'home' && next.name === 'shows') ? 'back' : 'forward');
      setRoute(next);
      setPublishing((current) => (current && !['saving', 'publishing'].includes(current.step) ? null : current));
      window.scrollTo({ top: 0 });
    }
    window.addEventListener('hashchange', onHashChangeHandler);
    return () => window.removeEventListener('hashchange', onHashChangeHandler);
  }, []);

  const registerGuard = useCallback((guard) => {
    guardRef.current = guard;
  }, []);

  const go = useCallback((next) => {
    if (hashFor(next) === (location.hash || '#/')) return;
    depthRef.current += 1;
    location.hash = hashFor(next);
  }, []);

  const back = useCallback(() => {
    const current = routeRef.current;
    if (depthRef.current > 0) {
      depthRef.current -= 1;
      history.back();
      return;
    }
    if (current.name === 'show' || current.name === 'new-show') go({ name: 'shows' });
    else go({ name: 'home' });
  }, [go]);

  const onSignInHandler = useCallback(async (email, password, turnstile) => {
    setSigningIn(true);
    setSignInError('');
    try {
      await backend.signIn(email, password, turnstile);
      await reload();
    } catch (error) {
      setSignInError(error.message);
    } finally {
      setSigningIn(false);
    }
  }, [backend, reload]);

  const publish = useCallback(async (change) => {
    const id = ++publishIdRef.current;
    publishRef.current = change;
    curtainDismissedRef.current = false;
    setPublishing({ step: 'saving', label: change.label });
    let startedAt = Date.now();
    const before = backend.kind === 'local' ? null : await readBuild();
    const batches = change.batches || [change.files || []];
    const intermediateShas = [];
    try {
      let sha = null;
      for (let i = 0; i < batches.length; i++) {
        const isLast = i === batches.length - 1;
        if (batches.length > 1 && id === publishIdRef.current) setPublishing({ step: 'saving', label: change.label, progress: `${i + 1} de ${batches.length}` });
        ({ sha } = await backend.commit({ message: isLast ? change.message : `${change.message} (fotos ${i + 1}/${batches.length})`, files: batches[i], deletions: isLast ? change.deletions || [] : [] }));
        if (isLast) startedAt = Date.now();
        else intermediateShas.push(sha);
      }
      change.apply?.();
      if (id === publishIdRef.current) setPublishing({ step: 'publishing', label: change.label, sha });
      const result = await waitForBuild({ sha, kind: backend.kind, startedAt, before, intermediateShas });
      if (id !== publishIdRef.current || curtainDismissedRef.current) {
        notify(result === 'done' ? `Ya está en la web: ${change.label}` : `${change.label}: se publicará en unos minutos`);
        return;
      }
      setPublishing({ step: result === 'done' ? 'done' : 'slow', label: change.label, sha, href: change.href });
    } catch (error) {
      if (id !== publishIdRef.current) {
        notify(`No se pudo guardar: ${change.label}. ${error.message}`, 'error');
        return;
      }
      if (error.code === 'UNAUTHORIZED') {
        setPublishing(null);
        askReauth(() => publish(change), null, (message) => notify(`No se guardó: ${change.label}. ${message}`, 'error'));
        return;
      }
      const partial = intermediateShas.length ? 'Las fotos ya se subieron; faltó publicar el texto. ' : '';
      setPublishing({ step: 'error', label: change.label, error: `${partial}${error.message}` });
    }
  }, [backend, notify, askReauth]);

  const onRetryPublishHandler = useCallback(() => {
    if (publishRef.current) publish(publishRef.current);
  }, [publish]);

  const onPublishedHandler = useCallback(() => {
    const goBackAfter = publishRef.current?.afterPublish;
    setPublishing(null);
    if (goBackAfter) goBackAfter();
  }, []);

  const onContinueHandler = useCallback(() => {
    curtainDismissedRef.current = true;
    onPublishedHandler();
  }, [onPublishedHandler]);

  const updateCache = useCallback((updater) => setContent((current) => (current ? updater(current) : current)), []);

  if (session.status === 'checking') {
    return html`<div class="login"><div class="login__card"><span class="spinner spinner--big login__spinner" aria-label="Cargando" /></div></div>`;
  }
  if (session.status === 'out') {
    return html`<${LoginScreen} onSubmit=${onSignInHandler} busy=${signingIn} error=${signInError} turnstileSiteKey=${session.config.turnstileSiteKey || ''} hint=${session.config.hint || ''} />`;
  }

  const screenProps = { content, loadError, onReload: reload, backend, user, notify, publish, updateCache, go, back, registerGuard, askReauth };
  let screen;
  if (route.name === 'section') {
    screen = html`<${EditorScreen} key=${`section-${route.id}`} kind="section" section=${ALL_SECTIONS[route.id]} ...${screenProps} />`;
  } else if (route.name === 'shows') {
    screen = html`<${ShowsScreen} key="shows" ...${screenProps} />`;
  } else if (route.name === 'show' || route.name === 'new-show') {
    screen = html`<${EditorScreen} key=${`show-${route.slug || 'new'}`} kind="show" slug=${route.slug || null} ...${screenProps} />`;
  } else {
    screen = html`<${HomeScreen} key="home" loading=${!content && !loadError} error=${loadError} onReload=${reload} onLogout=${signOut} local=${backend.kind === 'local'} ...${screenProps} />`;
  }

  return html`
    <div class="shell">
      <a class="skip-link" href="#panel-main">Saltar al contenido</a>
      <${Sidebar} route=${route} content=${content} go=${go} onLogout=${signOut} user=${user} />
      <div class="screen screen--${direction}" id="panel-main" tabindex="-1" key=${hashFor(route)}>${screen}</div>
    </div>
    ${publishing && html`<${PublishOverlay} state=${publishing} onDone=${onPublishedHandler} onRetry=${onRetryPublishHandler} onContinue=${onContinueHandler} />`}
    ${reauth && html`<${ReauthOverlay} onSubmit=${onReauthHandler} onCancel=${onCancelReauthHandler} busy=${signingIn} error=${signInError} turnstileSiteKey=${session.config.turnstileSiteKey || ''} />`}
    <${Toasts} items=${toasts} />
  `;
}

render(html`<${App} />`, document.getElementById('app'));
