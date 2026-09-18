// Generates the panel's sign-in credentials: a strong password (shown once),
// its scrypt hash and a session secret, ready to paste into Vercel's
// environment variables. With --write they're also saved to .env for local
// development. Usage: node scripts/make-password.js --email ella@correo.com [--write]
import fs from 'node:fs';
import { hashPassword, makePassword, makeSecret } from '../lib/panel-auth.js';

const args = process.argv.slice(2);
const email = (args[args.indexOf('--email') + 1] || '').trim().toLowerCase();
const write = args.includes('--write');
const password = makePassword();
const hash = await hashPassword(password);
const secret = makeSecret();

console.log('\nContraseña (guárdala en un gestor de contraseñas; no se puede recuperar):\n');
console.log(`  ${password}\n`);
console.log('Variables para Vercel → Settings → Environment Variables:\n');
console.log(`  PANEL_EMAIL=${email || '<correo de la clienta>'}`);
console.log(`  PANEL_PASSWORD_HASH=${hash}`);
console.log(`  SESSION_SECRET=${secret}`);
console.log('  GITHUB_TOKEN=<token fine-grained con Contents: Read and write sobre el repo>\n');

if (write) {
  const current = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const kept = current.split('\n').filter((l) => !/^(PANEL_EMAIL|PANEL_PASSWORD_HASH|SESSION_SECRET)=/.test(l) && l.trim() !== '');
  fs.writeFileSync('.env', [...kept, `PANEL_EMAIL=${email || 'dev@local'}`, `PANEL_PASSWORD_HASH=${hash}`, `SESSION_SECRET=${secret}`, ''].join('\n'));
  console.log('Guardado en .env (ignorado por git) para el modo local.\n');
}
