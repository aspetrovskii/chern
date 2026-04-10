export type Role = "user" | "assistant";

export type Track = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  energy: number;
  valence: number;
  tempo: number;
  tags: string[];
};

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  concertVersion?: number;
};

export type ConcertVersion = {
  version: number;
  /** Optional user-defined name for this version */
  label?: string;
  orderedTrackIds: string[];
  orderSource: "optimizer" | "user";
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatRecord = {
  id: string;
  title: string;
  targetTrackCount: number;
  messages: ChatMessage[];
  concerts: ConcertVersion[];
  createdAt: string;
  updatedAt: string;
};

import { t, type Locale } from "./i18n";

const STORAGE_KEY = "conce-mvp-chats-v1";
const DEFAULT_TARGET_COUNT = 10;

const TRACK_CATALOG: Track[] = [
  { id: "t001", title: "Neon Drift", artist: "Aurora Echo", uri: "spotify:track:t001", energy: 0.42, valence: 0.62, tempo: 104, tags: ["synthwave", "night", "neon", "chill"] },
  { id: "t002", title: "Steel Horizon", artist: "Pulse Harbor", uri: "spotify:track:t002", energy: 0.86, valence: 0.49, tempo: 146, tags: ["rock", "arena", "drive", "guitar"] },
  { id: "t003", title: "Low Tide Lights", artist: "Mellow Unit", uri: "spotify:track:t003", energy: 0.33, valence: 0.54, tempo: 92, tags: ["lofi", "study", "focus", "calm"] },
  { id: "t004", title: "Golden Rush", artist: "Kite Parade", uri: "spotify:track:t004", energy: 0.77, valence: 0.73, tempo: 128, tags: ["indie", "uplift", "sunset", "roadtrip"] },
  { id: "t005", title: "Velvet Snow", artist: "Cinder Bloom", uri: "spotify:track:t005", energy: 0.28, valence: 0.4, tempo: 84, tags: ["ambient", "cinematic", "sleep", "soft"] },
  { id: "t006", title: "Crowd Ignition", artist: "Razor District", uri: "spotify:track:t006", energy: 0.93, valence: 0.55, tempo: 164, tags: ["metal", "live", "concert", "heavy"] },
  { id: "t007", title: "Summer Fragments", artist: "Harbor Kids", uri: "spotify:track:t007", energy: 0.58, valence: 0.8, tempo: 116, tags: ["pop", "happy", "dance", "bright"] },
  { id: "t008", title: "Static Rain", artist: "Monochrome Club", uri: "spotify:track:t008", energy: 0.47, valence: 0.32, tempo: 100, tags: ["post-punk", "rainy", "moody", "dark"] },
  { id: "t009", title: "Orbit Bloom", artist: "Pixel Garden", uri: "spotify:track:t009", energy: 0.67, valence: 0.69, tempo: 122, tags: ["electronic", "festival", "dance", "space"] },
  { id: "t010", title: "Quiet Lantern", artist: "Mina Vale", uri: "spotify:track:t010", energy: 0.25, valence: 0.48, tempo: 78, tags: ["acoustic", "soft", "sad", "night"] },
  { id: "t011", title: "Thunder Anthem", artist: "Razor District", uri: "spotify:track:t011", energy: 0.95, valence: 0.52, tempo: 170, tags: ["rock", "concert", "anthem", "loud"] },
  { id: "t012", title: "Mirror Lake", artist: "Mellow Unit", uri: "spotify:track:t012", energy: 0.36, valence: 0.6, tempo: 90, tags: ["chill", "instrumental", "focus", "calm"] },
  { id: "t013", title: "Pulse Mosaic", artist: "Aurora Echo", uri: "spotify:track:t013", energy: 0.74, valence: 0.66, tempo: 130, tags: ["synthpop", "uplift", "dance", "night"] },
  { id: "t014", title: "Basement Sun", artist: "Kite Parade", uri: "spotify:track:t014", energy: 0.64, valence: 0.7, tempo: 118, tags: ["indie", "warm", "roadtrip", "guitar"] },
  { id: "t015", title: "Grey Hours", artist: "Monochrome Club", uri: "spotify:track:t015", energy: 0.4, valence: 0.28, tempo: 96, tags: ["melancholy", "rainy", "post-punk", "night"] },
];

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeParseChats(raw: string | null): ChatRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ChatRecord[];
  } catch {
    return [];
  }
}

export function listChats(): ChatRecord[] {
  const chats = safeParseChats(localStorage.getItem(STORAGE_KEY));
  return [...chats].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function saveChats(chats: ChatRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function createChat(): ChatRecord {
  const chats = listChats();
  const ts = nowIso();
  const chat: ChatRecord = {
    id: uid("chat"),
    title: "Новый концерт",
    targetTrackCount: DEFAULT_TARGET_COUNT,
    messages: [],
    concerts: [],
    createdAt: ts,
    updatedAt: ts,
  };
  chats.push(chat);
  saveChats(chats);
  return chat;
}

export function deleteChat(chatId: string): boolean {
  const chats = listChats();
  const next = chats.filter((chat) => chat.id !== chatId);
  if (next.length === chats.length) return false;
  saveChats(next);
  return true;
}

export function updateChatTitle(chatId: string, title: string): ChatRecord | null {
  const chats = listChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx < 0) return null;
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) return null;
  const ts = nowIso();
  const next: ChatRecord = { ...chats[idx], title: trimmed, updatedAt: ts };
  chats[idx] = next;
  saveChats(chats);
  return next;
}

export function updateConcertLabel(chatId: string, version: number, label: string): ChatRecord | null {
  const chats = listChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx < 0) return null;
  const chat = chats[idx];
  const concertIdx = chat.concerts.findIndex((c) => c.version === version);
  if (concertIdx < 0) return null;
  const ts = nowIso();
  const trimmed = label.trim().slice(0, 80);
  const nextConcert: ConcertVersion = { ...chat.concerts[concertIdx], updatedAt: ts };
  if (trimmed) nextConcert.label = trimmed;
  else delete nextConcert.label;
  const nextConcerts = [...chat.concerts];
  nextConcerts[concertIdx] = nextConcert;
  const next: ChatRecord = { ...chat, concerts: nextConcerts, updatedAt: ts };
  chats[idx] = next;
  saveChats(chats);
  return next;
}

export function updateChatTargetCount(chatId: string, targetTrackCount: number): ChatRecord | null {
  const chats = listChats();
  const nextCount = Math.max(5, Math.min(30, Math.round(targetTrackCount)));
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx < 0) return null;
  const next: ChatRecord = { ...chats[idx], targetTrackCount: nextCount, updatedAt: nowIso() };
  chats[idx] = next;
  saveChats(chats);
  return next;
}

function scoreTrack(track: Track, promptWords: string[], desiredEnergy: number): number {
  let relevance = 0;
  for (const w of promptWords) {
    if (track.tags.includes(w)) relevance += 1.2;
    if (track.title.toLowerCase().includes(w)) relevance += 0.6;
    if (track.artist.toLowerCase().includes(w)) relevance += 0.4;
  }
  const energyFit = 1 - Math.abs(track.energy - desiredEnergy);
  return relevance + energyFit;
}

function energyArcTarget(index: number, total: number): number {
  if (total <= 1) return 0.5;
  const x = index / (total - 1);
  return x <= 0.5 ? 0.3 + x * 1.2 : 0.9 - (x - 0.5) * 1.1;
}

function pairDistance(a: Track, b: Track): number {
  const de = Math.abs(a.energy - b.energy);
  const dv = Math.abs(a.valence - b.valence);
  const dt = Math.min(1, Math.abs(a.tempo - b.tempo) / 80);
  const tagOverlap = a.tags.filter((tag) => b.tags.includes(tag)).length;
  return de * 0.5 + dv * 0.3 + dt * 0.25 - Math.min(0.22, tagOverlap * 0.06);
}

function stateEnergy(order: Track[]): number {
  if (order.length === 0) return 0;
  let eTrans = 0;
  let eArc = 0;
  let eDiv = 0;
  for (let i = 0; i < order.length; i += 1) {
    if (i < order.length - 1) eTrans += pairDistance(order[i], order[i + 1]);
    eArc += Math.abs(order[i].energy - energyArcTarget(i, order.length));
    if (i > 0 && order[i].artist === order[i - 1].artist) eDiv += 0.8;
  }
  return eTrans * 0.52 + eArc * 0.32 + eDiv * 0.16;
}

function simulatedAnnealing(tracks: Track[]): Track[] {
  if (tracks.length <= 2) return tracks;
  let current = [...tracks];
  let currentEnergy = stateEnergy(current);
  let best = [...current];
  let bestEnergy = currentEnergy;
  let temp = 1;

  for (let k = 0; k < 1200; k += 1) {
    const i = Math.floor(Math.random() * current.length);
    let j = Math.floor(Math.random() * current.length);
    if (j === i) j = (j + 1) % current.length;
    const next = [...current];
    [next[i], next[j]] = [next[j], next[i]];
    const nextEnergy = stateEnergy(next);
    const delta = nextEnergy - currentEnergy;
    if (delta < 0 || Math.exp(-delta / temp) > Math.random()) {
      current = next;
      currentEnergy = nextEnergy;
      if (nextEnergy < bestEnergy) {
        best = next;
        bestEnergy = nextEnergy;
      }
    }
    temp = Math.max(0.02, temp * 0.996);
  }
  return best;
}

function parsePrompt(prompt: string): { words: string[]; desiredEnergy: number } {
  const text = prompt.toLowerCase();
  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  const lowMarkers = ["calm", "soft", "тихо", "спокойно", "ambient", "sad", "melancholy"];
  const highMarkers = ["rock", "metal", "dance", "energetic", "энерг", "громко", "концерт"];
  let desiredEnergy = 0.55;
  if (lowMarkers.some((m) => text.includes(m))) desiredEnergy = 0.35;
  if (highMarkers.some((m) => text.includes(m))) desiredEnergy = 0.8;

  return { words, desiredEnergy };
}

export function sendUserPrompt(chatId: string, prompt: string, locale: Locale = "en"): ChatRecord | null {
  const chats = listChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx < 0) return null;
  const chat = chats[idx];
  const ts = nowIso();
  const parsed = parsePrompt(prompt);
  const scored = [...TRACK_CATALOG]
    .map((track) => ({ track, score: scoreTrack(track, parsed.words, parsed.desiredEnergy) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(chat.targetTrackCount + 5, chat.targetTrackCount));
  const optimized = simulatedAnnealing(scored.map((s) => s.track)).slice(0, chat.targetTrackCount);
  const version = (chat.concerts.at(-1)?.version ?? 0) + 1;
  const concert: ConcertVersion = {
    version,
    orderedTrackIds: optimized.map((t) => t.id),
    orderSource: "optimizer",
    prompt,
    createdAt: ts,
    updatedAt: ts,
  };
  const userMessage: ChatMessage = {
    id: uid("msg"),
    role: "user",
    content: prompt,
    createdAt: ts,
  };
  const assistantMessage: ChatMessage = {
    id: uid("msg"),
    role: "assistant",
    content: t(locale, "chat_llm_reply", { count: concert.orderedTrackIds.length }),
    createdAt: ts,
    concertVersion: version,
  };
  const nextTitle = chat.messages.length === 0 ? prompt.slice(0, 40) || chat.title : chat.title;
  const nextChat: ChatRecord = {
    ...chat,
    title: nextTitle,
    messages: [...chat.messages, userMessage, assistantMessage],
    concerts: [...chat.concerts, concert],
    updatedAt: ts,
  };
  chats[idx] = nextChat;
  saveChats(chats);
  return nextChat;
}

export function updateConcertOrder(
  chatId: string,
  version: number,
  orderedTrackIds: string[]
): ChatRecord | null {
  const chats = listChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx < 0) return null;
  const chat = chats[idx];
  const concertIdx = chat.concerts.findIndex((c) => c.version === version);
  if (concertIdx < 0) return null;
  const ts = nowIso();
  const nextConcert: ConcertVersion = {
    ...chat.concerts[concertIdx],
    orderedTrackIds: [...orderedTrackIds],
    orderSource: "user",
    updatedAt: ts,
  };
  const nextConcerts = [...chat.concerts];
  nextConcerts[concertIdx] = nextConcert;
  const next: ChatRecord = { ...chat, concerts: nextConcerts, updatedAt: ts };
  chats[idx] = next;
  saveChats(chats);
  return next;
}

export function getTrackById(trackId: string): Track | null {
  return TRACK_CATALOG.find((t) => t.id === trackId) ?? null;
}
