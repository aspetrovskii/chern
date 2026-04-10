/**
 * Реальные вызовы `/api/v1` для чата и концерта (этап 6 плана).
 */
import { apiRequest } from "./api/http";
import type { Locale } from "./i18n";
import type {
  ChatMode,
  ChatMessage,
  ChatRecord,
  ConcertVersion,
  Track,
} from "./concertMvp";
import {
  loadSavedConcertsFromStorage,
  persistSavedConcerts,
  type SavedConcertItem,
} from "./savedConcertsMvp";

const trackCache = new Map<string, Track>();

export function primeTrackCache(tracks: Track[]): void {
  for (const t of tracks) {
    trackCache.set(t.id, t);
  }
}

export function getCachedTrack(id: string): Track | null {
  return trackCache.get(id) ?? null;
}

type ChatDto = {
  id: number;
  title: string;
  mode: string;
  source_spotify_playlist_id: string | null;
  target_track_count: number;
  created_at: string;
  updated_at: string;
};

type MessageDto = {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  status: string;
  structured_intent: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
};

type ConcertDto = {
  id: number;
  chat_id: number;
  version: number;
  ordered_track_ids: string[];
  spotify_playlist_id: string | null;
  order_source: string;
  label: string | null;
  created_at: string;
  updated_at: string;
};

type PoolDto = { track_ids: string[] };

function toIso(s: string): string {
  return s;
}

function mapMessage(m: MessageDto): ChatMessage {
  return {
    id: String(m.id),
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    createdAt: toIso(m.created_at),
  };
}

function mapConcert(c: ConcertDto): ConcertVersion {
  const src = c.order_source === "user" ? "user" : "optimizer";
  return {
    version: c.version,
    label: c.label ?? undefined,
    orderedTrackIds: c.ordered_track_ids,
    orderSource: src,
    prompt: "",
    createdAt: toIso(c.created_at),
    updatedAt: toIso(c.updated_at),
  };
}

async function assembleChatRecord(
  meta: ChatDto,
  messages: MessageDto[],
  concerts: ConcertDto[],
  poolTrackIds: string[],
  resolvedTracks: Track[]
): Promise<ChatRecord> {
  primeTrackCache(resolvedTracks);
  const concertsSorted = [...concerts].map(mapConcert).sort((a, b) => a.version - b.version);
  return {
    id: String(meta.id),
    title: meta.title,
    targetTrackCount: meta.target_track_count,
    mode: meta.mode as ChatMode,
    sourceSpotifyPlaylistId: meta.source_spotify_playlist_id,
    poolTrackIds,
    messages: messages.map(mapMessage),
    concerts: concertsSorted,
    createdAt: toIso(meta.created_at),
    updatedAt: toIso(meta.updated_at),
  };
}

async function resolveTrackIds(ids: string[]): Promise<Track[]> {
  const unique = [...new Set(ids)].slice(0, 200);
  if (unique.length === 0) return [];
  const r = await apiRequest<{ tracks: Track[] }>("/tracks/resolve", {
    method: "POST",
    json: { track_ids: unique },
  });
  return r.tracks;
}

async function pollMessage(chatId: number, msgId: number): Promise<void> {
  for (let i = 0; i < 120; i += 1) {
    const m = await apiRequest<MessageDto>(`/chats/${chatId}/messages/${msgId}`);
    if (m.status === "done" || m.status === "error") {
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

export async function apiListChats(): Promise<ChatRecord[]> {
  const rows = await apiRequest<ChatDto[]>("/chats");
  return rows.map((meta) => ({
    id: String(meta.id),
    title: meta.title,
    targetTrackCount: meta.target_track_count,
    mode: meta.mode as ChatMode,
    sourceSpotifyPlaylistId: meta.source_spotify_playlist_id,
    poolTrackIds: [],
    messages: [],
    concerts: [],
    createdAt: toIso(meta.created_at),
    updatedAt: toIso(meta.updated_at),
  }));
}

export async function apiLoadChatFull(chatId: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const [meta, messages, concerts, pool] = await Promise.all([
    apiRequest<ChatDto>(`/chats/${id}`),
    apiRequest<MessageDto[]>(`/chats/${id}/messages`),
    apiRequest<ConcertDto[]>(`/chats/${id}/concerts`),
    apiRequest<PoolDto>(`/chats/${id}/pool`),
  ]);
  const allTrackIds = [
    ...new Set([...pool.track_ids, ...concerts.flatMap((c) => c.ordered_track_ids)]),
  ];
  const resolved = await resolveTrackIds(allTrackIds);
  return assembleChatRecord(meta, messages, concerts, pool.track_ids, resolved);
}

export async function apiCreateChat(): Promise<ChatRecord> {
  const meta = await apiRequest<ChatDto>("/chats", { method: "POST", json: {} });
  return {
    id: String(meta.id),
    title: meta.title,
    targetTrackCount: meta.target_track_count,
    mode: meta.mode as ChatMode,
    sourceSpotifyPlaylistId: meta.source_spotify_playlist_id,
    poolTrackIds: [],
    messages: [],
    concerts: [],
    createdAt: toIso(meta.created_at),
    updatedAt: toIso(meta.updated_at),
  };
}

export async function apiDeleteChat(chatId: string): Promise<boolean> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return false;
  try {
    await apiRequest(`/chats/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

export async function apiPatchChatTitle(chatId: string, title: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}`, { method: "PATCH", json: { title: title.trim() } });
  return apiLoadChatFull(chatId);
}

export async function apiPatchChatTargetTrackCount(
  chatId: string,
  targetTrackCount: number
): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}`, { method: "PATCH", json: { target_track_count: targetTrackCount } });
  return apiLoadChatFull(chatId);
}

export async function apiPatchChatMode(chatId: string, mode: ChatMode): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}`, { method: "PATCH", json: { mode } });
  return apiLoadChatFull(chatId);
}

export async function apiPatchSourceSpotifyPlaylist(
  chatId: string,
  playlistId: string | null
): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}`, {
    method: "PATCH",
    json: { source_spotify_playlist_id: playlistId },
  });
  return apiLoadChatFull(chatId);
}

export async function apiPutPoolTrackIds(chatId: string, trackIds: string[]): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const cur = await apiRequest<PoolDto>(`/chats/${id}/pool`);
  const next = new Set(trackIds);
  const toRemove = cur.track_ids.filter((t) => !next.has(t));
  const toAdd = trackIds.filter((t) => !cur.track_ids.includes(t));
  if (toRemove.length > 0) {
    await apiRequest(`/chats/${id}/pool/tracks`, { method: "DELETE", json: { track_ids: toRemove } });
  }
  if (toAdd.length > 0) {
    await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { track_ids: toAdd } });
  }
  return apiLoadChatFull(chatId);
}

export async function apiPostPoolTrackIds(chatId: string, trackIds: string[]): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { track_ids: trackIds } });
  return apiLoadChatFull(chatId);
}

export async function apiDeletePoolTrack(chatId: string, trackId: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/pool/tracks`, { method: "DELETE", json: { track_ids: [trackId] } });
  return apiLoadChatFull(chatId);
}

export async function apiPostLoadPoolFromLinkedPlaylist(chatId: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const meta = await apiRequest<ChatDto>(`/chats/${id}`);
  const pid = meta.source_spotify_playlist_id;
  if (!pid) return null;
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { playlist_id: pid } });
  return apiLoadChatFull(chatId);
}

export async function apiPatchConcertOrder(
  chatId: string,
  version: number,
  orderedTrackIds: string[]
): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/concert/order`, {
    method: "PATCH",
    json: { version, ordered_track_ids: orderedTrackIds },
  });
  return apiLoadChatFull(chatId);
}

export async function apiPatchConcertLabel(
  chatId: string,
  version: number,
  label: string
): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/concert/meta`, {
    method: "PATCH",
    json: { version, label },
  });
  return apiLoadChatFull(chatId);
}

export async function apiPostChatPrompt(
  chatId: string,
  prompt: string,
  _locale: Locale
): Promise<ChatRecord | null> {
  void _locale;
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const gen = await apiRequest<{ message_id: number; status: string }>(`/chats/${id}/messages`, {
    method: "POST",
    json: { content: prompt },
  });
  await pollMessage(id, gen.message_id);
  return apiLoadChatFull(chatId);
}

export async function apiPostRebuildConcertFromPool(
  chatId: string,
  _locale: Locale
): Promise<ChatRecord | null> {
  void _locale;
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const gen = await apiRequest<{ message_id: number; status: string }>(`/chats/${id}/generate`, {
    method: "POST",
  });
  await pollMessage(id, gen.message_id);
  return apiLoadChatFull(chatId);
}

export async function apiGetTrackMeta(trackId: string): Promise<Track | null> {
  const hit = getCachedTrack(trackId);
  if (hit) return hit;
  const r = await resolveTrackIds([trackId]);
  return r[0] ?? null;
}

export async function apiGetCandidateTracks(chat: ChatRecord): Promise<Track[]> {
  if (chat.poolTrackIds.length === 0) return [];
  return resolveTrackIds(chat.poolTrackIds);
}

export async function apiListSavedConcerts(): Promise<SavedConcertItem[]> {
  return Promise.resolve(loadSavedConcertsFromStorage());
}

export async function apiPutSavedConcerts(items: SavedConcertItem[]): Promise<void> {
  persistSavedConcerts(items);
  return Promise.resolve();
}

export type SpotifyPlaylistRow = { id: string; name: string };

export async function apiListSpotifyPlaylists(): Promise<SpotifyPlaylistRow[]> {
  return apiRequest<SpotifyPlaylistRow[]>("/spotify/playlists");
}

export async function apiPostPoolFromSpotifyUrl(chatId: string, spotifyUrl: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const u = spotifyUrl.trim();
  if (!u) return apiLoadChatFull(chatId);
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { spotify_url: u } });
  return apiLoadChatFull(chatId);
}

export async function apiPostPoolFromPlaylistId(chatId: string, playlistId: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { playlist_id: playlistId } });
  return apiLoadChatFull(chatId);
}

export async function apiPostPoolFromAlbumId(chatId: string, albumId: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { album_id: albumId } });
  return apiLoadChatFull(chatId);
}

export async function apiPostPoolFromArtistId(chatId: string, artistId: string): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { artist_id: artistId } });
  return apiLoadChatFull(chatId);
}

export async function apiPostPoolFromTrackIds(chatId: string, trackIds: string[]): Promise<ChatRecord | null> {
  const id = Number(chatId);
  if (Number.isNaN(id)) return null;
  const cleaned = [...new Set(trackIds.map((x) => x.trim()).filter(Boolean))];
  if (cleaned.length === 0) return apiLoadChatFull(chatId);
  await apiRequest(`/chats/${id}/pool`, { method: "POST", json: { track_ids: cleaned } });
  return apiLoadChatFull(chatId);
}

export type { ChatMode, SavedConcertItem };
