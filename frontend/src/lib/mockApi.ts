import { handleMockApiV1 } from "./mockApiV1";

const LATENCY_MS = 180;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SiteConfig = {
  appName: string;
  version: string;
  env: string;
  features: string[];
};

export async function fetchSiteConfig(): Promise<SiteConfig> {
  await delay(LATENCY_MS);
  return {
    appName: "Conce Music AI",
    version: "0.1.0-mock",
    env: "mock",
    features: ["i18n", "routing", "header"],
  };
}

let mockFetchInstalled = false;

export function installMockFetchInterceptor(): void {
  if (mockFetchInstalled) return;
  mockFetchInstalled = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (import.meta.env.VITE_USE_MOCK_API === "true") {
      const mocked = await handleMockApiV1(url, init);
      if (mocked) return mocked;
    }
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
