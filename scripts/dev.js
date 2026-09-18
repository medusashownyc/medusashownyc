// `npm run dev`: the Eleventy dev server (site + panel, live reload) and the
// local panel API side by side, in one terminal.
import { spawn } from 'node:child_process';
import { loadEnv } from './load-env.js';

loadEnv();

const eleventy = spawn('npx', ['@11ty/eleventy', '--serve', '--port', process.env.PORT || '8080'], { stdio: 'inherit', shell: true, env: { ...process.env, PANEL_DEV: '1' } });
const panelApi = spawn(process.execPath, ['scripts/dev-panel-api.js'], { stdio: 'inherit' });

/** Stops both children when the parent exits. */
function shutdown() {
  eleventy.kill();
  panelApi.kill();
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
eleventy.on('exit', shutdown);
