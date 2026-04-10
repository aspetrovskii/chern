/**
 * Mock Spotify catalogue for the pool editor (DEV).
 * Mirrors backend contract shapes conceptually; no real Spotify calls.
 * Track ids must match `TRACK_CATALOG` in concertMvp.
 */

export type MockSpotifyPlaylist = {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
};

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

const PLAYLISTS: MockSpotifyPlaylist[] = [
  {
    id: "pl_night_drive",
    name: "Night Drive — synth & pulse",
    description: "Neon synths and steady night energy",
    trackIds: ["t001", "t008", "t013", "t003", "t010"],
  },
  {
    id: "pl_rock_live",
    name: "Arena rock & live energy",
    trackIds: ["t002", "t006", "t011", "t004", "t014"],
  },
  {
    id: "pl_chill_focus",
    name: "Chill focus pool",
    trackIds: ["t003", "t005", "t012", "t010", "t015"],
  },
  {
    id: "pl_festival",
    name: "Festival floor",
    trackIds: ["t007", "t009", "t004", "t013", "t002"],
  },
];

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

export function listMockPlaylists(): MockSpotifyPlaylist[] {
  return [...PLAYLISTS];
}

export function findMockPlaylist(id: string): MockSpotifyPlaylist | null {
  return PLAYLISTS.find((p) => p.id === id) ?? null;
}

export function getTrackIdsForPlaylist(playlistId: string): string[] {
  const pl = findMockPlaylist(playlistId);
  return pl ? [...pl.trackIds] : [];
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
