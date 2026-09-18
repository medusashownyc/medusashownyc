/** Serializes a value for an inline <script> block or an HTML attribute, escaping "<" so "</script>" (or any tag) can never break out of it. */
export function safeJson(value) {
  return JSON.stringify(value ?? null).replace(/</g, '\\u003c');
}
