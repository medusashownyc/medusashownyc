// How the panel talks to the server. Every call goes to this site's own
// /api/panel/* functions (or, on localhost, the dev API on port 8082 that runs
// the same handlers). The session lives in an httpOnly cookie set by the
// server, so the browser's JavaScript never holds a password or a token.

const LOCAL_API = 'http://localhost:8082';

/** True when the panel runs from a local dev server. */
export function isLocalMode() {
  return ['localhost', '127.0.0.1'].includes(location.hostname);
}

/** Error carrying the server's plain-Spanish message and a code for the UI. */
function apiError(message, code) {
  return Object.assign(new Error(message), { code });
}

/** Content and sign-in operations against the panel API. */
export class ApiBackend {
  constructor() {
    this.base = isLocalMode() ? LOCAL_API : '';
    this.kind = isLocalMode() ? 'local' : 'github';
  }

  /** Request with the session cookie; turns failures into Spanish messages. */
  async request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${this.base}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'X-Requested-With': 'medusa-panel', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      });
    } catch {
      throw apiError(isLocalMode() ? 'No responde la API local. Arranca el proyecto con "npm run dev".' : 'Sin conexión. Revisa tu internet e inténtalo otra vez.', 'OFFLINE');
    }
    let body = {};
    try {
      body = await response.json();
    } catch {
      /* empty body */
    }
    if (response.status === 401) throw apiError(body.error || 'Tu sesión caducó. Vuelve a entrar.', 'UNAUTHORIZED');
    if (!response.ok) throw apiError(body.error || `No se pudo completar la operación (error ${response.status}).`, 'API');
    return body;
  }

  /** Who is signed in ({ auth: true, email, name }); throws UNAUTHORIZED (with sign-in config in `details`) when nobody is. */
  async currentUser() {
    let response;
    try {
      response = await fetch(`${this.base}/api/panel/session`, { credentials: 'include', headers: { 'X-Requested-With': 'medusa-panel' } });
    } catch {
      throw apiError(isLocalMode() ? 'No responde la API local. Arranca el proyecto con "npm run dev".' : 'Sin conexión. Revisa tu internet e inténtalo otra vez.', 'OFFLINE');
    }
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) throw Object.assign(apiError('No has iniciado sesión.', 'UNAUTHORIZED'), { details: body });
    if (!response.ok) throw apiError(body.error || 'No se pudo comprobar la sesión.', 'API');
    return body;
  }

  /** Signs in with email + password (+ Turnstile token when the site uses it). */
  signIn(email, password, turnstile) {
    return this.request('/api/panel/session', { method: 'POST', body: JSON.stringify({ email, password, turnstile }) });
  }

  /** Ends the session on the server (clears the cookie); throws when the server can't be reached. */
  signOut() {
    return this.request('/api/panel/session', { method: 'DELETE' });
  }

  /** Parsed JSON content of a content file, or null when it doesn't exist. */
  async readJson(path) {
    const result = await this.request(`/api/panel/content?op=file&path=${encodeURIComponent(path)}`);
    return result.content === null ? null : JSON.parse(result.content);
  }

  /** Files inside a repo directory: [{ name, path, size }]. */
  async listDir(path) {
    return (await this.request(`/api/panel/content?op=list&path=${encodeURIComponent(path)}`)).files;
  }

  /** Saves every change as one commit; resolves with { sha }. */
  commit(change) {
    return this.request('/api/panel/commit', { method: 'POST', body: JSON.stringify(change) });
  }
}

/** The one backend the panel uses. */
export function createBackend() {
  return new ApiBackend();
}
