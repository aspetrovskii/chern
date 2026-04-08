/**
 * Cloudflare Turnstile — load API and render widgets.
 * Replace site key with your key from https://dash.cloudflare.com → Turnstile.
 * Client test sitekey (always passes, visible) — NOT the Siteverify secret:
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */

export const TURNSTILE_SITE_KEY =
  typeof window !== "undefined" && window.__TURNSTILE_SITE_KEY__
    ? window.__TURNSTILE_SITE_KEY__
    : "1x00000000000000000000AA";

let loadPromise = /** @type {Promise<void> | null} */ (null);

/** @returns {Promise<void>} */
export function loadTurnstileScript() {
  if (typeof window !== "undefined" && window.turnstile) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-cf-turnstile-api="1"]');
    if (existing) {
      const done = () => {
        if (window.turnstile) resolve();
        else reject(new Error("Turnstile API missing"));
      };
      if (window.turnstile) {
        done();
        return;
      }
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script error")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.dataset.cfTurnstileApi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile script failed"));
    document.head.appendChild(s);
  });
  return loadPromise;
}
