/**
 * Пул: альбомы/артисты — локальный мок; плейлисты Spotify — GET /api/v1/spotify/* (mockApi) + fallback mockBackendData.
 */

import { findMockPlaylistDef, MOCK_PLAYLIST_DEFINITIONS } from "./mockBackendData";

export type MockSpotifyPlaylist = {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
};

const API_V1 = "/api/v1";

export type MockAlbum = {
  id: string;
  title: string;
  artistName: string;
  trackIds: string[];
};

export type MockArtist = {
  id: string;
  name: string;
  trackIds: string[];
};

const ALBUMS: MockAlbum[] = [
  {
    id: "al_echo_lp1",
    title: "Echo LP I",
    artistName: "Aurora Echo",
    trackIds: ["t001", "t013"],
  },
  {
    id: "al_harbor_sessions",
    title: "Harbor Sessions",
    artistName: "Mellow Unit",
    trackIds: ["t003", "t012"],
  },
  {
    id: "al_razor_live",
    title: "Live Cuts",
    artistName: "Razor District",
    trackIds: ["t006", "t011"],
  },
];

const ARTISTS: MockArtist[] = [
  { id: "ar_aurora_echo", name: "Aurora Echo", trackIds: ["t001", "t013"] },
  { id: "ar_razor", name: "Razor District", trackIds: ["t006", "t011"] },
  { id: "ar_mono", name: "Monochrome Club", trackIds: ["t008", "t015"] },
  { id: "ar_kite", name: "Kite Parade", trackIds: ["t004", "t014"] },
];

function defsToPlaylists(): MockSpotifyPlaylist[] {
  return MOCK_PLAYLIST_DEFINITIONS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    trackIds: [...p.trackIds],
  }));
}

/** Синхронный список (fallback / SSR без fetch) */
export function listMockPlaylists(): MockSpotifyPlaylist[] {
  return defsToPlaylists();
}

export async function fetchPlaylistSummaries(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(`${API_V1}/spotify/playlists`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { items?: { id: string; name: string }[] };
    const items = data.items;
    if (!Array.isArray(items)) throw new Error("bad_shape");
    return items.map((x) => ({ id: x.id, name: x.name }));
  } catch {
    return defsToPlaylists().map((p) => ({ id: p.id, name: p.name }));
  }
}

type SpotifyTracksJson = {
  items?: { track?: { id?: string } | null }[] | null;
};

export async function fetchPlaylistTrackIds(playlistId: string): Promise<string[]> {
  const trimmed = playlistId.trim();
  if (!trimmed) return [];

  try {
    const res = await fetch(`${API_V1}/spotify/playlists/${encodeURIComponent(trimmed)}/tracks`);
    if (res.ok) {
      const data = (await res.json()) as SpotifyTracksJson;
      const items = data.items;
      if (Array.isArray(items)) {
        const ids = items
          .map((row) => (row.track && typeof row.track.id === "string" ? row.track.id : null))
          .filter((x): x is string => Boolean(x));
        if (ids.length > 0) return ids;
      }
    }
  } catch {
    /* fallback below */
  }

  const local = findMockPlaylistDef(trimmed);
  return local ? [...local.trackIds] : [];
}

export function findMockPlaylist(id: string): MockSpotifyPlaylist | null {
  const def = findMockPlaylistDef(id);
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    trackIds: [...def.trackIds],
  };
}

/** Синхронно только локальный каталог; для полного списка с бэкенда — fetchPlaylistTrackIds. */
export function getTrackIdsForPlaylist(playlistId: string): string[] {
  return findMockPlaylistDef(playlistId.trim())?.trackIds ?? [];
}

export function getTrackIdsForAlbum(albumId: string): string[] {
  const a = ALBUMS.find((x) => x.id === albumId.trim()) ?? null;
  return a ? [...a.trackIds] : [];
}

export function getTrackIdsForArtist(artistId: string): string[] {
  const a = ARTISTS.find((x) => x.id === artistId.trim()) ?? null;
  return a ? [...a.trackIds] : [];
}

export function parseCommaSeparatedTrackIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}
