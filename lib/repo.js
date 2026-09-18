/** The repository the panel edits (also overridable with env vars for forks or a rename). */
export const REPO = {
  owner: process.env.REPO_OWNER || 'medusashownyc',
  repo: process.env.REPO_NAME || 'medusashownyc',
  branch: process.env.REPO_BRANCH || 'main',
};
