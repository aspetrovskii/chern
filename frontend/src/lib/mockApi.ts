import { findMockPlaylistDef, MOCK_PLAYLIST_DEFINITIONS } from "./mockBackendData";

const LATENCY_MS = 180;
const API_V1_PREFIX = "/api/v1";

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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseApiV1Path(url: string): string | null {
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, window.location.origin);
    if (!u.pathname.startsWith(API_V1_PREFIX)) return null;
    return u.pathname.slice(API_V1_PREFIX.length) || "/";
  } catch {
    return null;
  }
}

function resolveFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const fromInit = init?.method?.toUpperCase();
  if (fromInit) return fromInit;
  if (typeof input !== "string" && !(input instanceof URL)) return (input.method || "GET").toUpperCase();
  return "GET";
}

function handleApiV1Request(path: string, method: string): Response | null {
  if (method !== "GET" && method !== "HEAD") return jsonResponse({ error: "method_not_allowed" }, 405);

  if (path === "/me" || path === "/me/") {
    return jsonResponse({
      id: "mock_spotify_user_01",
      display_name: "Conce Demo",
      email: "demo@conce.local",
      product: "premium",
      country: "RU",
    });
  }

  if (path === "/spotify/playlists" || path === "/spotify/playlists/") {
    const items = MOCK_PLAYLIST_DEFINITIONS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      public: true,
      collaborative: false,
      snapshot_id: `snap_${p.id}_v1`,
      tracks: { href: `${API_V1_PREFIX}/spotify/playlists/${p.id}/tracks`, total: p.trackIds.length },
      owner: { id: "mock_spotify_user_01", display_name: "Conce Demo" },
    }));
    return jsonResponse({
      href: `${window.location.origin}${API_V1_PREFIX}/spotify/playlists`,
      limit: 50,
      offset: 0,
      total: items.length,
      items,
    });
  }

  const tracksMatch = path.match(/^\/spotify\/playlists\/([^/]+)\/tracks\/?$/);
  if (tracksMatch) {
    const playlistId = decodeURIComponent(tracksMatch[1] ?? "");
    const def = findMockPlaylistDef(playlistId);
    if (!def) return jsonResponse({ error: "playlist_not_found" }, 404);
    const items = def.trackIds.map((tid, i) => ({
      added_at: new Date(Date.now() - i * 60_000).toISOString(),
      track: {
        id: tid,
        uri: `spotify:track:${tid}`,
        name: `Track ${tid}`,
        duration_ms: 200_000 + (i % 40) * 1000,
        artists: [{ id: `ar_${tid}`, name: "Mock Artist" }],
        album: { id: `al_${tid}`, name: "Mock Album" },
      },
    }));
    return jsonResponse({
      href: `${window.location.origin}${API_V1_PREFIX}/spotify/playlists/${playlistId}/tracks`,
      limit: 100,
      offset: 0,
      next: null,
      previous: null,
      total: items.length,
      items,
    });
  }

  const plMatch = path.match(/^\/spotify\/playlists\/([^/]+)\/?$/);
  if (plMatch) {
    const playlistId = decodeURIComponent(plMatch[1] ?? "");
    const def = findMockPlaylistDef(playlistId);
    if (!def) return jsonResponse({ error: "playlist_not_found" }, 404);
    return jsonResponse({
      id: def.id,
      name: def.name,
      description: def.description ?? "",
      public: true,
      snapshot_id: `snap_${def.id}_v1`,
      tracks: { total: def.trackIds.length },
      owner: { id: "mock_spotify_user_01", display_name: "Conce Demo" },
    });
  }

  if (path === "/chats" || path === "/chats/") {
    return jsonResponse({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
      _note: "MVP: чаты хранятся в localStorage; полный CRUD — на реальном бэкенде",
    });
  }

  return null;
}

let mockFetchInstalled = false;

export function installMockFetchInterceptor(): void {
  if (mockFetchInstalled) return;
  mockFetchInstalled = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

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

    const apiPath = parseApiV1Path(url);
    if (apiPath !== null) {
      await delay(Math.min(LATENCY_MS, 120));
      const m = resolveFetchMethod(input, init);
      const hit = handleApiV1Request(apiPath, m);
      if (hit) return hit;
      return jsonResponse({ error: "not_found", path: apiPath }, 404);
    }

    return original(input, init);
  };
}
