import { useEffect, useRef, useCallback } from '../lib/preact.js';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Loads Cloudflare Turnstile once and renders the widget into `container`; hands each token (or '' when it expires) to `onToken`. Returns a reset function for after a failed sign-in (tokens are single-use). */
export function useTurnstile(siteKey, container, onToken, onError) {
  const widgetRef = useRef(null);
  const reset = useCallback(() => {
    if (widgetRef.current !== null && window.turnstile) window.turnstile.reset(widgetRef.current);
    onToken('');
  }, [onToken]);
  useEffect(() => {
    if (!siteKey || !container.current) return undefined;
    let widgetId = null;
    let cancelled = false;
    let loaded = false;
    const render = () => {
      loaded = true;
      if (cancelled || !window.turnstile || !container.current) return;
      widgetId = window.turnstile.render(container.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onError?.(), theme: 'light', language: 'es' });
      widgetRef.current = widgetId;
    };
    if (window.turnstile) render();
    else {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.onload = render;
      script.onerror = () => onError?.();
      document.head.appendChild(script);
    }
    const timer = window.setTimeout(() => { if (!loaded && !cancelled) onError?.(); }, 12000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
      widgetRef.current = null;
    };
  }, [siteKey, container, onToken, onError]);
  return reset;
}
