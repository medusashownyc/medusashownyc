// Server-side access to the site's repository for the content panel. Runs
// inside Vercel functions with a fine-grained GitHub token (GITHUB_TOKEN env
// var, Contents read/write on this one repo); the browser never sees it.

const GITHUB_API = 'https://api.github.com';

/** Decodes the base64 body the GitHub contents API returns. */
function decodeContent(base64) {
  return Buffer.from(base64.replace(/\n/g, ''), 'base64').toString('utf8');
}

/** Turns a GitHub failure into a plain-Spanish message. */
async function describeFailure(response) {
  let message = '';
  try {
    message = (await response.json()).message || '';
  } catch {
    /* no body */
  }
  if (response.status === 401) return 'El acceso del panel al repositorio caducó. Avisa a Daniel para renovarlo.';
  if (response.status === 403 && /rate limit/i.test(message)) return 'GitHub está limitando las peticiones. Espera unos minutos e inténtalo otra vez.';
  if (response.status === 403 || response.status === 404) return 'El panel no tiene permiso para editar el repositorio. Avisa a Daniel.';
  if (response.status === 409 || response.status === 422) return 'La web cambió mientras editabas. Recarga el panel e inténtalo otra vez.';
  if (response.status >= 500) return 'GitHub no responde ahora mismo. Inténtalo en unos minutos.';
  return `No se pudo completar la operación (error ${response.status}).`;
}

/**
 * Content store backed by the GitHub REST API. Every store the panel API
 * accepts (this one, and LocalStore in scripts/dev-panel-api.js) implements
 * the same three methods: readFile(path) → string|null, listDir(path) →
 * [{ name, path, size }], commit({ message, files, deletions, author }) → { sha }.
 */
export class GitHubStore {
  constructor({ token, owner, repo, branch }) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  /** Authenticated request; throws with a Spanish message on failure. */
  async request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${GITHUB_API}${path}`, {
        ...options,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'medusa-panel',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new Error('No se pudo conectar con GitHub. Inténtalo otra vez.');
    }
    if (response.status === 404 && options.allow404) return null;
    if (!response.ok) throw new Error(await describeFailure(response));
    return response.status === 204 ? null : response.json();
  }

  /** Text content of a repo file, or null when it doesn't exist. */
  async readFile(path) {
    const file = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`, { allow404: true });
    return file ? decodeContent(file.content) : null;
  }

  /** Files inside a repo directory: [{ name, path, size }]. */
  async listDir(path) {
    const entries = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`, { allow404: true });
    return (entries || []).filter((e) => e.type === 'file').map((e) => ({ name: e.name, path: e.path, size: e.size }));
  }

  /** One commit with every change via the Git data API, attributed to the person editing; retried once if the branch moved. */
  async commit({ message, files = [], deletions = [], author }) {
    const base = `/repos/${this.owner}/${this.repo}/git`;
    const blobs = [];
    for (const file of files) {
      const body = file.base64 ? { content: file.base64, encoding: 'base64' } : { content: file.content, encoding: 'utf-8' };
      const blob = await this.request(`${base}/blobs`, { method: 'POST', body: JSON.stringify(body) });
      blobs.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = [...blobs, ...deletions.map((path) => ({ path, mode: '100644', type: 'blob', sha: null }))];
    for (let attempt = 0; attempt < 2; attempt++) {
      const ref = await this.request(`${base}/ref/heads/${this.branch}`);
      const head = ref.object.sha;
      const parent = await this.request(`${base}/commits/${head}`);
      const newTree = await this.request(`${base}/trees`, { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
      const commit = await this.request(`${base}/commits`, { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [head], ...(author ? { author } : {}) }) });
      try {
        await this.request(`${base}/refs/heads/${this.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
        return { sha: commit.sha };
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
    throw new Error('No se pudo guardar. Inténtalo otra vez.');
  }
}
