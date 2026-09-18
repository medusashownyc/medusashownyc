import { handleCommit } from '../../lib/panel-api.js';
import { GitHubStore } from '../../lib/github-store.js';
import { REPO } from '../../lib/repo.js';

/** Vercel function: saves a signed-in editor's changes as one commit on the site's repository. */
export function POST(request) {
  return handleCommit(request, process.env, new GitHubStore({ token: process.env.GITHUB_TOKEN, ...REPO }));
}
