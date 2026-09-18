// Local API for the content panel during development. Runs the SAME handlers
// as the Vercel functions (lib/panel-api.js: sign-in, sessions, validation)
// but with a store that reads and writes content/ and src/assets/ on disk, so
// the whole flow can be tried without GitHub. Started by `npm run dev`.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { loadEnv } from './load-env.js';
import { handleSession, handleContent, handleCommit } from '../lib/panel-api.js';
import { hashPassword, makeSecret } from '../lib/panel-auth.js';

loadEnv();
const PORT = Number(process.env.PANEL_API_PORT || 8082);
const ROOT = path.resolve(process.cwd());
const env = { ...process.env };
if (!env.PANEL_EMAIL || !env.PANEL_PASSWORD_HASH) {
  env.PANEL_EMAIL = 'dev@local';
  env.PANEL_PASSWORD_HASH = await hashPassword('dev');
  env.PANEL_DEV_HINT = 'Acceso de desarrollo: dev@local / dev (crea un .env con scripts/make-password.js para usar credenciales reales).';
  console.log('[panel-api] sin PANEL_EMAIL/PANEL_PASSWORD_HASH en .env → acceso de desarrollo dev@local / dev');
}
if (!env.SESSION_SECRET) env.SESSION_SECRET = makeSecret();

/** Resolves a repo-relative path inside the working copy (the handlers already validated it). */
function resolve(relative) {
  return path.join(ROOT, path.posix.normalize(String(relative)));
}

/** Eleventy's watcher logs a deleted content file but doesn't rebuild; bumping a content file's mtime makes it rebuild. */
async function touchForRebuild() {
  const now = new Date();
  await fs.utimes(path.join(ROOT, 'content/settings.json'), now, now).catch(() => {});
}

/** Content store that works on the local working copy (same interface as GitHubStore). */
class LocalStore {
  /** Text content of a file, or null when it doesn't exist. */
  async readFile(relative) {
    return fs.readFile(resolve(relative), 'utf8').catch(() => null);
  }

  /** Files inside a directory: [{ name, path, size }]. */
  async listDir(relative) {
    const dir = resolve(relative);
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const stat = await fs.stat(path.join(dir, entry.name));
      files.push({ name: entry.name, path: path.posix.join(relative, entry.name), size: stat.size });
    }
    return files;
  }

  /** Writes and deletes on disk; Eleventy's watcher rebuilds the site. */
  async commit({ files, deletions }) {
    for (const file of files) {
      const target = resolve(file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.base64 ? Buffer.from(file.base64, 'base64') : file.content);
    }
    for (const deletion of deletions) await fs.rm(resolve(deletion), { force: true });
    if (deletions.length && !files.length) await touchForRebuild();
    return { sha: `local-${Date.now()}` };
  }
}

const localStore = new LocalStore();

const ROUTES = {
  '/api/panel/session': (request) => handleSession(request, env),
  '/api/panel/content': (request) => handleContent(request, env, localStore),
  '/api/panel/commit': (request) => handleCommit(request, env, localStore),
};

/** Node request → Web Request (body fully read). */
async function toWebRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
  return new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body });
}

/** Routes one request, adding the CORS headers the panel page (another localhost port) needs. */
async function handle(req, res) {
  const origin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin || '') ? req.headers.origin : '';
  const cors = origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  const route = ROUTES[new URL(req.url, `http://localhost:${PORT}`).pathname];
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...cors });
    return res.end(JSON.stringify({ error: 'No encontrado' }));
  }
  const response = await route(await toWebRequest(req));
  const headers = { ...cors };
  response.headers.forEach((value, key) => { if (key !== 'set-cookie') headers[key] = value; });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) headers['set-cookie'] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer((req, res) => handle(req, res).catch((error) => { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); })).listen(PORT, () => {
  console.log(`[panel-api] escuchando en http://localhost:${PORT} (mismos handlers que Vercel; escribe en content/ y src/assets/)`);
});
