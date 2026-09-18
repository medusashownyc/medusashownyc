// Single place that provides the UI runtime (Preact + htm, no build step).
// The files live in src/admin/vendor/ and are mapped to the bare names below
// by the import map in index.html, so the panel works without any CDN.
import { h } from 'preact';
import htm from 'htm';

export { h, render, Fragment } from 'preact';
export { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks';
export const html = htm.bind(h);
