/**
 * Async façade for chat/concert actions until real `/api/v1/...` routes exist.
 * Currently delegates to `concertMvp` (localStorage). Swap implementations for `fetch` later.
 */
import type { Locale } from "./i18n";
import {
  createChat as mvpCreateChat,
  deleteChat as mvpDeleteChat,
  getTrackById as mvpGetTrackById,
  listChats as mvpListChats,
  sendUserPrompt as mvpSendUserPrompt,
  updateChatTitle as mvpUpdateChatTitle,
  updateConcertLabel as mvpUpdateConcertLabel,
  updateConcertOrder as mvpUpdateConcertOrder,
  updateChatTargetCount as mvpUpdateChatTargetCount,
  type ChatRecord,
  type Track,
} from "./concertMvp";

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

export async function apiGetTrackMeta(trackId: string): Promise<Track | null> {
  return Promise.resolve(mvpGetTrackById(trackId));
}
