// Outline icons (24×24, stroke 1.8) shared by the panel — same visual
// language as the site's own icons.
const wrap = (paths, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;

export const icons = {
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  trash: wrap('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  up: wrap('<path d="M6 14l6-6 6 6"/>'),
  down: wrap('<path d="M6 10l6 6 6-6"/>'),
  camera: wrap('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  library: wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 5"/><circle cx="16" cy="9" r="1.5"/>'),
  external: wrap('<path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6"/>'),
  logout: wrap('<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>'),
  sparkle: wrap('<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>'),
  people: wrap('<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  gift: wrap('<path d="M4 10h16v10H4zM2 7h20v3H2zM12 7v13M12 7c-2-3-6-3-6 0h6zm0 0c2-3 6-3 6 0h-6z"/>'),
  quote: wrap('<path d="M7 17c2 0 3-1.5 3-3.5V7H4v6h3c0 2-1 3-3 3zm10 0c2 0 3-1.5 3-3.5V7h-6v6h3c0 2-1 3-3 3z"/>'),
  calendar: wrap('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  gallery: wrap('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  theater: wrap('<path d="M4 5c2.5 1 5.5 1 8 0v7a4 4 0 0 1-8 0zM12 9c2.5 1 5.5 1 8 0v7a4 4 0 0 1-8 0z"/><path d="M6 9h1M9 9h1M14 13h1M17 13h1"/>'),
  settings: wrap('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  text: wrap('<path d="M4 6h16M4 12h10M4 18h14"/>'),
  key: wrap('<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l3 3M14 8l3 3"/>'),
  github: wrap('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
  refresh: wrap('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>'),
  warning: wrap('<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>'),
  eye: wrap('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  edit: wrap('<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13 7 4 4"/>'),
  drag: wrap('<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>'),
  symbol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c-3 0-5 2-5 4.5S9 11 9 13s-2 2.5-2 4.5S9.5 21 12 21s5-1.5 5-3.5S15 15 15 13s2-3 2-5.5S15 3 12 3Z"/><path d="M12 3v18"/></svg>',
};

/** Flag pills for the two site languages (same shapes as the site's own switcher). */
export const flags = {
  es: '<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="24" height="24" fill="#AA151B"/><rect y="6" width="24" height="12" fill="#F1BF00"/></svg>',
  en: '<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="24" height="24" fill="#B22234"/><rect y="1.85" width="24" height="1.85" fill="#fff"/><rect y="5.54" width="24" height="1.85" fill="#fff"/><rect y="9.23" width="24" height="1.85" fill="#fff"/><rect y="12.92" width="24" height="1.85" fill="#fff"/><rect y="16.62" width="24" height="1.85" fill="#fff"/><rect y="20.31" width="24" height="1.85" fill="#fff"/><rect width="10.5" height="13" fill="#3C3B6E"/></svg>',
};
