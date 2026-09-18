// HTTP handlers behind the content panel (/api/panel/*). Used both by the
// Vercel functions in api/panel/ (with the GitHub store) and by the local dev
// server in scripts/dev-panel-api.js (with a store that writes to disk), so
// the exact same sign-in, session and validation code runs in both places.
import { verifyPassword, createSession, readSession, cookieFromHeader, sessionCookie, createRateLimiter, passwordFingerprint } from './panel-auth.js';

const WRITABLE = ['content/', 'src/assets/'];
const IMAGE_FILE = /\.(webp|jpe?g|png|gif|avif)$/i;
const JSON_FILE = /\.json$/i;
// Vercel functions reject request bodies over 4.5 MB; the panel splits bigger saves into several commits.
const MAX_COMMIT_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 40;
const MAX_DELETIONS = 10;
const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const AUTHOR_EMAIL = 'panel@medusa-show.invalid';
const TURNSTILE = { OK: 'ok', FAILED: 'failed', UNAVAILABLE: 'unavailable' };
const limiter = createRateLimiter();
const emailLimiter = createRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 });
const globalLimiter = createRateLimiter({ max: 60, windowMs: 60 * 1000 });

/** JSON response helper. */
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}

/** Client IP as the platform sets it (never the client-controlled first hop of x-forwarded-for). */
function clientIp(request) {
  const trusted = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip');
  if (trusted) return trusted.split(',')[0].trim();
  const chain = (request.headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return chain[chain.length - 1] || 'unknown';
}

/** True when the request itself is served from localhost (development). */
function isLocalRequest(request) {
  const url = new URL(request.url);
  return url.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(url.hostname);
}

/** True when the request comes from a page of this same site (localhost pages only count while developing on localhost). */
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return request.method === 'GET';
  const own = new URL(request.url).origin;
  return origin === own || (isLocalRequest(request) && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}

/** Session for the request, or null. */
function sessionOf(request, env) {
  return readSession(cookieFromHeader(request.headers.get('cookie')), env.SESSION_SECRET, passwordFingerprint(env.PANEL_PASSWORD_HASH));
}

/** Cookies are marked Secure except on plain-http localhost (dev). */
function cookieOptions(request) {
  return { secure: !isLocalRequest(request) };
}

/** New session cookie for an email. */
function issueCookie(request, env, email) {
  return sessionCookie(createSession(email, env.SESSION_SECRET, passwordFingerprint(env.PANEL_PASSWORD_HASH)), cookieOptions(request));
}

/** Rejects repo paths outside the writable folders or with traversal. */
function assertWritablePath(path) {
  const clean = String(path || '');
  if (!clean || clean.includes('..') || clean.startsWith('/') || clean.includes('\\') || !WRITABLE.some((p) => clean.startsWith(p))) {
    throw new Error('Ruta no permitida.');
  }
  if (clean.startsWith('content/') && !JSON_FILE.test(clean)) throw new Error('Solo se pueden guardar archivos JSON en content/.');
  if (clean.startsWith('src/assets/') && !IMAGE_FILE.test(clean)) throw new Error('Solo se pueden subir imágenes a src/assets/.');
  return clean;
}

/** True when both Turnstile keys are configured. */
function turnstileConfigured(env) {
  return Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY);
}

/** Cloudflare Turnstile check: 'ok', 'failed' (bad or missing token) or 'unavailable' (Cloudflare unreachable, not the user's fault). */
async function verifyTurnstile(token, ip, env, request) {
  if (!turnstileConfigured(env)) return isLocalRequest(request) || env.PANEL_ALLOW_NO_TURNSTILE === '1' ? TURNSTILE.OK : TURNSTILE.FAILED;
  try {
    const response = await fetch(TURNSTILE_VERIFY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token || '', remoteip: ip }) });
    if (!response.ok) return TURNSTILE.UNAVAILABLE;
    return (await response.json()).success === true ? TURNSTILE.OK : TURNSTILE.FAILED;
  } catch {
    return TURNSTILE.UNAVAILABLE;
  }
}

/** Randomized pause so failed sign-ins can't be timed or hammered. */
function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 300));
}

/** GET → who is signed in (or the public sign-in config); POST → sign in; DELETE → sign out. */
export async function handleSession(request, env) {
  if (request.method === 'GET') {
    const session = sessionOf(request, env);
    if (!session) return json({ auth: false, turnstileSiteKey: env.TURNSTILE_SITE_KEY || '', hint: isLocalRequest(request) ? env.PANEL_DEV_HINT || '' : '' }, 401);
    const headers = session.renew ? { 'Set-Cookie': issueCookie(request, env, session.email) } : {};
    return json({ auth: true, email: session.email, name: env.PANEL_NAME || '' }, 200, headers);
  }
  if (request.method === 'DELETE') {
    return json({ auth: false }, 200, { 'Set-Cookie': sessionCookie('', cookieOptions(request)) });
  }
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
  if (!env.SESSION_SECRET || !env.PANEL_EMAIL || !env.PANEL_PASSWORD_HASH) return json({ error: 'El acceso no está configurado todavía en Vercel. Avisa a quien administra la web.' }, 503);
  if (!turnstileConfigured(env) && !isLocalRequest(request) && env.PANEL_ALLOW_NO_TURNSTILE !== '1') return json({ error: 'Falta configurar la verificación anti-bots (Turnstile) en Vercel. Avisa a quien administra la web.' }, 503);
  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Datos incompletos.' }, 400);
  }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const ip = clientIp(request);
  const key = `${ip}|${email}`;
  if (!email || !password) return json({ error: 'Escribe tu correo y tu contraseña.' }, 400);
  if (globalLimiter.isBlocked('all')) return json({ error: 'Demasiados intentos en este momento. Espera un minuto y vuelve a probar.' }, 429);
  if (limiter.isBlocked(key) || limiter.isBlocked(ip) || emailLimiter.isBlocked(email)) return json({ error: 'Demasiados intentos. Espera 15 minutos y vuelve a probar.' }, 429);
  const turnstile = await verifyTurnstile(body.turnstile, ip, env, request);
  if (turnstile === TURNSTILE.UNAVAILABLE) return json({ error: 'La verificación anti-bots no responde ahora mismo. Inténtalo en un momento.' }, 503);
  if (turnstile !== TURNSTILE.OK) {
    limiter.recordFailure(ip);
    globalLimiter.recordFailure('all');
    return json({ error: 'La verificación anti-bots caducó. Vuelve a marcar la casilla e inténtalo otra vez.' }, 400);
  }
  const emailMatches = email === String(env.PANEL_EMAIL).trim().toLowerCase();
  const passwordMatches = await verifyPassword(password, emailMatches ? env.PANEL_PASSWORD_HASH : undefined);
  if (!emailMatches || !passwordMatches) {
    limiter.recordFailure(key);
    limiter.recordFailure(ip);
    emailLimiter.recordFailure(email);
    globalLimiter.recordFailure('all');
    await pause(600);
    return json({ error: 'Correo o contraseña incorrectos.' }, 401);
  }
  limiter.reset(key);
  limiter.reset(ip);
  emailLimiter.reset(email);
  return json({ auth: true, email, name: env.PANEL_NAME || '' }, 200, { 'Set-Cookie': issueCookie(request, env, email) });
}

/** GET ?op=file&path=… → { content } | GET ?op=list&path=… → { files }. Requires a session. */
export async function handleContent(request, env, store) {
  if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
  if (!sessionOf(request, env)) return json({ error: 'Tu sesión caducó. Vuelve a entrar.' }, 401);
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const path = url.searchParams.get('path') || '';
  if (path.includes('..') || path.startsWith('/') || !(path.startsWith('content/') || path.startsWith('src/assets/'))) return json({ error: 'Ruta no permitida.' }, 400);
  try {
    if (op === 'file') return json({ content: await store.readFile(path) });
    if (op === 'list') return json({ files: await store.listDir(path) });
  } catch (error) {
    return json({ error: error.message }, 502);
  }
  return json({ error: 'Operación desconocida.' }, 400);
}

/** POST { message, files, deletions } → { sha }. Requires a session, a same-origin page and the panel's request header. */
export async function handleCommit(request, env, store) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const session = sessionOf(request, env);
  if (!session) return json({ error: 'Tu sesión caducó. Vuelve a entrar.' }, 401);
  if (!sameOrigin(request) || request.headers.get('x-requested-with') !== 'medusa-panel') return json({ error: 'Origen no permitido.' }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Datos incompletos.' }, 400);
  }
  const files = Array.isArray(body.files) ? body.files : [];
  const deletions = Array.isArray(body.deletions) ? body.deletions : [];
  try {
    if (files.length + deletions.length === 0) throw new Error('Nada que guardar.');
    if (files.length > MAX_FILES) throw new Error(`Demasiados archivos en un solo guardado (máximo ${MAX_FILES}).`);
    if (deletions.length > MAX_DELETIONS) throw new Error(`Demasiados borrados en un solo guardado (máximo ${MAX_DELETIONS}).`);
    let bytes = 0;
    for (const file of files) {
      assertWritablePath(file.path);
      if (typeof file.content === 'string') bytes += Buffer.byteLength(file.content);
      else if (typeof file.base64 === 'string') bytes += file.base64.length;
      else throw new Error('Archivo sin contenido.');
    }
    for (const path of deletions) {
      assertWritablePath(path);
      if (!path.startsWith('content/shows/')) throw new Error('Solo se pueden eliminar shows.');
    }
    if (bytes > MAX_COMMIT_BYTES) throw new Error('Demasiadas fotos en un solo guardado. Inténtalo con menos fotos a la vez.');
  } catch (error) {
    return json({ error: error.message }, 400);
  }
  const message = String(body.message || 'chore: cms — cambios desde el panel').slice(0, 200);
  const author = { name: 'Panel Medusa Show', email: env.PANEL_AUTHOR_EMAIL || AUTHOR_EMAIL };
  try {
    return json(await store.commit({ message, files, deletions, author }));
  } catch (error) {
    return json({ error: error.message }, 502);
  }
}
