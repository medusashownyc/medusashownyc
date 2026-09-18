import { handleContent } from '../../lib/panel-api.js';
import { GitHubStore } from '../../lib/github-store.js';
import { REPO } from '../../lib/repo.js';

/** Vercel function: reads content files and image listings for a signed-in editor. */
export function GET(request) {
  return handleContent(request, process.env, new GitHubStore({ token: process.env.GITHUB_TOKEN, ...REPO }));
}
