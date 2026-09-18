// Minimal .env loader for the dev scripts (no dependency): KEY=VALUE lines,
// comments with #, optional quotes. Never overrides variables already set.
import fs from 'node:fs';

/** Reads .env from the project root into process.env. */
export function loadEnv(file = '.env') {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || line.trim().startsWith('#')) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
