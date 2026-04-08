/**
 * Mock API layer — replace with real backend calls later.
 * Simulates latency and JSON responses for frontend testing.
 */

const LATENCY_MS = 180;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @typedef {{ appName: string; version: string; env: string; features: string[] }} SiteConfig
 */

/** @returns {Promise<SiteConfig>} */
export async function fetchSiteConfig() {
  await delay(LATENCY_MS);
  return {
    appName: "Conce AI",
    version: "0.1.0-mock",
    env: "mock",
    features: ["i18n", "routing", "header"],
  };
}

/**
 * Install optional fetch interceptor for paths starting with /api/mock/
 * Use when testing code written against fetch().
 */
export function installMockFetchInterceptor() {
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("/api/mock/")) {
      await delay(LATENCY_MS);
      if (url.includes("config")) {
        const body = await fetchSiteConfig();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }
    return original(input, init);
  };
}
