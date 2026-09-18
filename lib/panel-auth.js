// Native sign-in for the content panel: one email + one password, checked on
// the server. The password is never stored: only an scrypt hash lives in the
// PANEL_PASSWORD_HASH env var. A successful sign-in issues a signed, expiring
// session token that travels in an httpOnly cookie, so nothing secret ever
// sits in the browser's JavaScript or localStorage.
import { scrypt, randomBytes, timingSafeEqual, createHmac, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_MS = 3 * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = 'medusa_session';
export const COOKIE_PATH = '/api/panel';
// A hash that never matches, used to keep timing identical when the email is unknown.
const DECOY_HASH = 'scrypt$32768$8$1$gZq1Ck0oT7cB7Z9dP5v1nA$Wl4uD0qJ2Yv9v6r0J9Zk2j3xMv0yT8pQk4Q5hQb3F1oZbYw7Xk0v1n2Q3s4R5t6U7v8W9x0Y1z2A3b4C5d6E7f8';

/** Base64url without padding. */
function b64url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

/** scrypt hash of a password in the self-describing form scrypt$N$r$p$salt$hash. */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${b64url(salt)}$${b64url(hash)}`;
}

/** Constant-time check of a password against a stored scrypt hash. */
export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, salt, hash] = String(stored || DECOY_HASH).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(String(password ?? '').normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Random secret for SESSION_SECRET (64 hex chars). */
export function makeSecret() {
  return randomBytes(32).toString('hex');
}

/** Strong, typeable password: six groups of four unambiguous characters (24 chars over 55 symbols ≈ 138 bits), sampled without modulo bias. */
export function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const limit = 256 - (256 % alphabet.length);
  const chars = [];
  while (chars.length < 24) {
    for (const byte of randomBytes(32)) {
      if (byte < limit && chars.length < 24) chars.push(alphabet[byte % alphabet.length]);
    }
  }
  return [0, 4, 8, 12, 16, 20].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

/** Short fingerprint of the stored password hash; sessions carry it, so changing the password signs everyone out. */
export function passwordFingerprint(storedHash) {
  return createHash('sha256').update(String(storedHash || '')).digest('base64url').slice(0, 12);
}

/** HMAC-SHA256 signature of a session payload. */
function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Creates a session token for an email, bound to the current password: base64url(payload).signature */
export function createSession(email, secret, fingerprint, now = Date.now()) {
  const payload = b64url(JSON.stringify({ v: 2, e: email, f: fingerprint, iat: now, exp: now + SESSION_TTL_MS, n: randomBytes(8).toString('hex') }));
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the session ({ email, exp, renew }) when the token is valid, unexpired and issued for the current password, otherwise null. */
export function readSession(token, secret, fingerprint, now = Date.now()) {
  if (!token || !secret || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (data.v !== 2 || typeof data.e !== 'string' || typeof data.exp !== 'number' || data.exp <= now || data.f !== fingerprint) return null;
  return { email: data.e, exp: data.exp, renew: data.exp - now < SESSION_RENEW_MS };
}

/** Value of the session cookie in a Cookie header, if present. */
export function cookieFromHeader(header) {
  const match = String(header || '').match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : '';
}

/** Set-Cookie header that stores (or clears, with an empty token) the session. */
export function sessionCookie(token, { secure = true } = {}) {
  const base = `${COOKIE_NAME}=${token}; HttpOnly; Path=${COOKIE_PATH}; SameSite=Strict${secure ? '; Secure' : ''}`;
  return token ? `${base}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}` : `${base}; Max-Age=0`;
}

/** In-memory brute-force limiter: a key (ip + email) is blocked after `max` failures inside `windowMs`. */
export function createRateLimiter({ max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const failures = new Map();
  return {
    isBlocked(key, now = Date.now()) {
      const entry = failures.get(key);
      if (!entry) return false;
      if (now - entry.first > windowMs) {
        failures.delete(key);
        return false;
      }
      return entry.count >= max;
    },
    recordFailure(key, now = Date.now()) {
      const entry = failures.get(key);
      if (!entry || now - entry.first > windowMs) failures.set(key, { first: now, count: 1 });
      else entry.count += 1;
      if (failures.size > 5000) failures.clear();
    },
    reset(key) {
      failures.delete(key);
    },
  };
}
