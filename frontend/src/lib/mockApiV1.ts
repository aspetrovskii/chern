/**
 * In-browser mock for `/api/v1` when VITE_USE_MOCK_API=true (no Python backend).
 */
import { getTrackById } from "./concertMvp";
import {
  findMockPlaylist,
  getTrackIdsForAlbum,
  getTrackIdsForArtist,
  listMockPlaylists,
} from "./poolEditorMvp";

const STORAGE_KEY = "conce-mock-api-v1";

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

type ChatState = {
  meta: ChatDto;
  messages: MessageDto[];
  concerts: ConcertDto[];
  pool: string[];
};

type Persisted = {
  nextChatId: number;
  nextMsgId: number;
  nextConcertId: number;
  chats: Record<string, ChatState>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function emptyPersisted(): Persisted {
  return { nextChatId: 1, nextMsgId: 1, nextConcertId: 1, chats: {} };
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersisted();
    const o: unknown = JSON.parse(raw);
    if (!o || typeof o !== "object") return emptyPersisted();
    const p = o as Partial<Persisted>;
    if (typeof p.nextChatId !== "number" || typeof p.chats !== "object" || p.chats === null) {
      return emptyPersisted();
    }
    return {
      nextChatId: p.nextChatId,
      nextMsgId: typeof p.nextMsgId === "number" ? p.nextMsgId : 1,
      nextConcertId: typeof p.nextConcertId === "number" ? p.nextConcertId : 1,
      chats: p.chats as Record<string, ChatState>,
    };
  } catch {
    return emptyPersisted();
  }
}

let mem = loadPersisted();

function save(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function empty204(): Response {
  return new Response(null, { status: 204 });
}

function poolAdd(pool: string[], ids: string[]): void {
  const seen = new Set(pool);
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    pool.push(id);
    seen.add(id);
  }
}

function poolRemove(pool: string[], ids: string[]): void {
  const rm = new Set(ids);
  const next = pool.filter((id) => !rm.has(id));
  pool.length = 0;
  pool.push(...next);
}

function tracksFromSpotifyUrl(u: string): string[] {
  const s = u.trim();
  const pl = s.match(/playlist\/([a-zA-Z0-9]+)/);
  if (pl) {
    const ids = findMockPlaylist(pl[1])?.trackIds;
    if (ids?.length) return [...ids];
  }
  const alb = s.match(/album\/([a-zA-Z0-9]+)/);
  if (alb) {
    const ids = getTrackIdsForAlbum(alb[1]);
    if (ids.length) return ids;
  }
  const art = s.match(/artist\/([a-zA-Z0-9]+)/);
  if (art) {
    const ids = getTrackIdsForArtist(art[1]);
    if (ids.length) return ids;
  }
  return ["t001", "t002", "t003", "t004", "t005"];
}

function resolveTracks(ids: string[]): { tracks: unknown[] } {
  const tracks = ids.map((id) => getTrackById(id)).filter(Boolean);
  return { tracks };
}

function getChat(id: number): ChatState | null {
  return mem.chats[String(id)] ?? null;
}

function touchMeta(meta: ChatDto): void {
  meta.updated_at = nowIso();
}

function newChatDto(id: number): ChatDto {
  const t = nowIso();
  return {
    id,
    title: "New chat",
    mode: "spotify_discovery",
    source_spotify_playlist_id: null,
    target_track_count: 10,
    created_at: t,
    updated_at: t,
  };
}

function parsePath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function parseJsonBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    const o: unknown = JSON.parse(init.body);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function handleMockApiV1(url: string, init?: RequestInit): Promise<Response | null> {
  if (import.meta.env.VITE_USE_MOCK_API !== "true") return null;

  let pathname: string;
  try {
    pathname = new URL(url, window.location.origin).pathname;
  } catch {
    return null;
  }

  const base = "/api/v1";
  if (!pathname.startsWith(base)) return null;

  const path = pathname.slice(base.length) || "/";
  const segs = parsePath(path);
  const method = (init?.method ?? "GET").toUpperCase();

  await new Promise((r) => setTimeout(r, 40));

  /* Auth & meta */
  if (method === "GET" && segs[0] === "providers" && segs[1] === "status") {
    return json({ ui_data_source: "mock_fallback" });
  }

  if (method === "GET" && segs[0] === "auth" && segs[1] === "spotify" && segs[2] === "login") {
    const baseUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const auth_url = `${baseUrl.replace(/#$/, "")}#/auth?access_token=mock_dev_token`;
    return json({ auth_url });
  }

  if (method === "POST" && segs[0] === "auth" && segs[1] === "logout") {
    return empty204();
  }

  if (method === "GET" && segs[0] === "me") {
    return json({ email: "dev@conce.mock", spotify_user_id: "mock_listener" });
  }

  if (method === "POST" && segs[0] === "tracks" && segs[1] === "resolve") {
    const body = parseJsonBody(init);
    const raw = body.track_ids;
    const ids = Array.isArray(raw) ? raw.map(String) : [];
    return json(resolveTracks(ids));
  }

  if (method === "GET" && segs[0] === "spotify" && segs[1] === "playlists") {
    const rows = listMockPlaylists().map((p) => ({ id: p.id, name: p.name }));
    return json(rows);
  }

  /* Chats */
  if (segs[0] === "chats" && segs.length === 1) {
    if (method === "GET") {
      const list = Object.values(mem.chats)
        .map((c) => c.meta)
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      return json(list);
    }
    if (method === "POST") {
      const id = mem.nextChatId++;
      const meta = newChatDto(id);
      mem.chats[String(id)] = { meta, messages: [], concerts: [], pool: [] };
      save();
      return json(meta);
    }
  }

  const chatId = segs[1] !== undefined ? Number(segs[1]) : NaN;
  if (segs[0] === "chats" && Number.isFinite(chatId) && segs.length >= 2) {
    const st = getChat(chatId);
    if (!st) {
      return json({ error_code: "not_found", message: "chat not found" }, 404);
    }

    if (method === "GET" && segs.length === 2) {
      return json(st.meta);
    }

    if (method === "DELETE" && segs.length === 2) {
      delete mem.chats[String(chatId)];
      save();
      return empty204();
    }

    if (method === "PATCH" && segs.length === 2) {
      const body = parseJsonBody(init);
      const m = st.meta;
      if (typeof body.title === "string") m.title = body.title;
      if (typeof body.target_track_count === "number") m.target_track_count = body.target_track_count;
      if (typeof body.mode === "string") m.mode = body.mode;
      if (body.source_spotify_playlist_id === null) m.source_spotify_playlist_id = null;
      else if (typeof body.source_spotify_playlist_id === "string") {
        m.source_spotify_playlist_id = body.source_spotify_playlist_id;
      }
      touchMeta(m);
      save();
      return json(m);
    }

    if (method === "GET" && segs[2] === "messages" && segs.length === 3) {
      return json(st.messages);
    }

    if (method === "POST" && segs[2] === "messages" && segs.length === 3) {
      const body = parseJsonBody(init);
      const content = typeof body.content === "string" ? body.content : "";
      const uid = mem.nextMsgId++;
      const userMsg: MessageDto = {
        id: uid,
        chat_id: chatId,
        role: "user",
        content,
        status: "done",
        structured_intent: null,
        error: null,
        created_at: nowIso(),
      };
      st.messages.push(userMsg);
      const aid = mem.nextMsgId++;
      const reply: MessageDto = {
        id: aid,
        chat_id: chatId,
        role: "assistant",
        content:
          "[Mock API] Here is a placeholder assistant reply. Connect the real backend for LLM output.",
        status: "done",
        structured_intent: null,
        error: null,
        created_at: nowIso(),
      };
      st.messages.push(reply);
      touchMeta(st.meta);
      save();
      return json({ message_id: aid, status: "done" });
    }

    if (method === "GET" && segs[2] === "messages" && segs.length === 4) {
      const mid = Number(segs[3]);
      const msg = st.messages.find((x) => x.id === mid);
      if (!msg) return json({ error_code: "not_found", message: "message not found" }, 404);
      return json(msg);
    }

    if (method === "GET" && segs[2] === "concerts" && segs.length === 3) {
      const list = [...st.concerts].sort((a, b) => a.version - b.version);
      return json(list);
    }

    if (method === "PATCH" && segs[2] === "concert" && segs[3] === "order" && segs.length === 4) {
      const body = parseJsonBody(init);
      const version = Number(body.version);
      const oti = body.ordered_track_ids;
      const ids = Array.isArray(oti) ? oti.map(String) : [];
      const c = st.concerts.find((x) => x.version === version);
      if (c) {
        c.ordered_track_ids = ids;
        c.updated_at = nowIso();
        touchMeta(st.meta);
        save();
      }
      return json(st.meta);
    }

    if (method === "PATCH" && segs[2] === "concert" && segs[3] === "meta" && segs.length === 4) {
      const body = parseJsonBody(init);
      const version = Number(body.version);
      const label = typeof body.label === "string" ? body.label : "";
      const c = st.concerts.find((x) => x.version === version);
      if (c) {
        c.label = label || null;
        c.updated_at = nowIso();
        touchMeta(st.meta);
        save();
      }
      return json(st.meta);
    }

    if (method === "GET" && segs[2] === "pool" && segs.length === 3) {
      return json({ track_ids: [...st.pool] });
    }

    if (method === "POST" && segs[2] === "pool" && segs.length === 3) {
      const body = parseJsonBody(init);
      if (Array.isArray(body.track_ids)) {
        poolAdd(st.pool, body.track_ids.map(String));
      } else if (typeof body.playlist_id === "string") {
        const pl = findMockPlaylist(body.playlist_id.trim());
        if (pl) poolAdd(st.pool, pl.trackIds);
      } else if (typeof body.spotify_url === "string") {
        poolAdd(st.pool, tracksFromSpotifyUrl(body.spotify_url));
      } else if (typeof body.album_id === "string") {
        poolAdd(st.pool, getTrackIdsForAlbum(body.album_id.trim()));
      } else if (typeof body.artist_id === "string") {
        poolAdd(st.pool, getTrackIdsForArtist(body.artist_id.trim()));
      }
      touchMeta(st.meta);
      save();
      return json({ track_ids: [...st.pool] });
    }

    if (method === "DELETE" && segs[2] === "pool" && segs[3] === "tracks" && segs.length === 4) {
      const body = parseJsonBody(init);
      const raw = body.track_ids;
      const ids = Array.isArray(raw) ? raw.map(String) : [];
      poolRemove(st.pool, ids);
      touchMeta(st.meta);
      save();
      return json({ track_ids: [...st.pool] });
    }

    if (method === "POST" && segs[2] === "generate" && segs.length === 3) {
      const m = st.meta;
      const maxV = st.concerts.reduce((acc, c) => Math.max(acc, c.version), 0);
      const nextVersion = maxV + 1;
      const cap = Math.max(1, m.target_track_count);
      const ordered = st.pool.slice(0, Math.min(st.pool.length, cap));
      const cid = mem.nextConcertId++;
      const t = nowIso();
      const concert: ConcertDto = {
        id: cid,
        chat_id: chatId,
        version: nextVersion,
        ordered_track_ids: ordered.length ? ordered : ["t001", "t002", "t003"],
        spotify_playlist_id: null,
        order_source: "optimizer",
        label: null,
        created_at: t,
        updated_at: t,
      };
      st.concerts.push(concert);
      const aid = mem.nextMsgId++;
      st.messages.push({
        id: aid,
        chat_id: chatId,
        role: "assistant",
        content: `[Mock API] Concert v${nextVersion} generated (${concert.ordered_track_ids.length} tracks).`,
        status: "done",
        structured_intent: null,
        error: null,
        created_at: t,
      });
      touchMeta(m);
      save();
      return json({ message_id: aid, status: "done" });
    }
  }

  return json({ error_code: "mock_unimplemented", message: pathname }, 501);
}
