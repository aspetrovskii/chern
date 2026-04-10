/**
 * Async façade for chat/concert actions until real `/api/v1/...` routes exist.
 * Currently delegates to `concertMvp` (localStorage). Swap implementations for `fetch` later.
 */
import type { Locale } from "./i18n";
import {
  addTracksToPool as mvpAddTracksToPool,
  candidateTracksForChat as mvpCandidateTracksForChat,
  createChat as mvpCreateChat,
  deleteChat as mvpDeleteChat,
  getTrackById as mvpGetTrackById,
  listChats as mvpListChats,
  loadPoolFromSourcePlaylist as mvpLoadPoolFromSourcePlaylist,
  rebuildConcertFromPool as mvpRebuildConcertFromPool,
  removePoolTrack as mvpRemovePoolTrack,
  replacePoolTracks as mvpReplacePoolTracks,
  sendUserPrompt as mvpSendUserPrompt,
  setChatMode as mvpSetChatMode,
  setSourceSpotifyPlaylist as mvpSetSourceSpotifyPlaylist,
  updateChatTitle as mvpUpdateChatTitle,
  updateConcertLabel as mvpUpdateConcertLabel,
  updateConcertOrder as mvpUpdateConcertOrder,
  updateChatTargetCount as mvpUpdateChatTargetCount,
  type ChatMode,
  type ChatRecord,
  type Track,
} from "./concertMvp";
import {
  loadSavedConcertsFromStorage,
  persistSavedConcerts,
  type SavedConcertItem,
} from "./savedConcertsMvp";

export async function apiListChats(): Promise<ChatRecord[]> {
  return Promise.resolve(mvpListChats());
}

export async function apiCreateChat(): Promise<ChatRecord> {
  return Promise.resolve(mvpCreateChat());
}

export async function apiDeleteChat(chatId: string): Promise<boolean> {
  return Promise.resolve(mvpDeleteChat(chatId));
}

export async function apiPatchChatTitle(chatId: string, title: string): Promise<ChatRecord | null> {
  return Promise.resolve(mvpUpdateChatTitle(chatId, title));
}

export async function apiPatchChatTargetTrackCount(
  chatId: string,
  targetTrackCount: number
): Promise<ChatRecord | null> {
  return Promise.resolve(mvpUpdateChatTargetCount(chatId, targetTrackCount));
}

export async function apiPatchChatMode(chatId: string, mode: ChatMode): Promise<ChatRecord | null> {
  return Promise.resolve(mvpSetChatMode(chatId, mode));
}

export async function apiPatchSourceSpotifyPlaylist(
  chatId: string,
  playlistId: string | null
): Promise<ChatRecord | null> {
  return Promise.resolve(mvpSetSourceSpotifyPlaylist(chatId, playlistId));
}

export async function apiPutPoolTrackIds(chatId: string, trackIds: string[]): Promise<ChatRecord | null> {
  return Promise.resolve(mvpReplacePoolTracks(chatId, trackIds));
}

export async function apiPostPoolTrackIds(chatId: string, trackIds: string[]): Promise<ChatRecord | null> {
  return Promise.resolve(mvpAddTracksToPool(chatId, trackIds));
}

export async function apiDeletePoolTrack(chatId: string, trackId: string): Promise<ChatRecord | null> {
  return Promise.resolve(mvpRemovePoolTrack(chatId, trackId));
}

export async function apiPostLoadPoolFromLinkedPlaylist(chatId: string): Promise<ChatRecord | null> {
  return Promise.resolve(mvpLoadPoolFromSourcePlaylist(chatId));
}

export async function apiPatchConcertOrder(
  chatId: string,
  version: number,
  orderedTrackIds: string[]
): Promise<ChatRecord | null> {
  return Promise.resolve(mvpUpdateConcertOrder(chatId, version, orderedTrackIds));
}

export async function apiPatchConcertLabel(
  chatId: string,
  version: number,
  label: string
): Promise<ChatRecord | null> {
  return Promise.resolve(mvpUpdateConcertLabel(chatId, version, label));
}

export async function apiPostChatPrompt(
  chatId: string,
  prompt: string,
  locale: Locale
): Promise<ChatRecord | null> {
  return Promise.resolve(mvpSendUserPrompt(chatId, prompt, locale));
}

export async function apiPostRebuildConcertFromPool(
  chatId: string,
  locale: Locale
): Promise<ChatRecord | null> {
  return Promise.resolve(mvpRebuildConcertFromPool(chatId, locale));
}

export async function apiGetTrackMeta(trackId: string): Promise<Track | null> {
  return Promise.resolve(mvpGetTrackById(trackId));
}

export async function apiGetCandidateTracks(chat: ChatRecord): Promise<Track[]> {
  return Promise.resolve(mvpCandidateTracksForChat(chat));
}

export async function apiListSavedConcerts(): Promise<SavedConcertItem[]> {
  return Promise.resolve(loadSavedConcertsFromStorage());
}

export async function apiPutSavedConcerts(items: SavedConcertItem[]): Promise<void> {
  persistSavedConcerts(items);
  return Promise.resolve();
}

export type { ChatMode, SavedConcertItem };
