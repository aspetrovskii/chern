import { apiRequest, clearAccessToken, getAccessToken } from "./api/http";

const USERS_KEY = "conce-auth-users";
const SESSION_KEY = "conce-auth-session";

export type StoredUser = { login: string; email: string; passHash: string };

function normalizeLogin(s: string): string {
  return s.trim().toLowerCase();
}

function isValidEmailShape(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function isValidLoginShape(login: string): boolean {
  const l = normalizeLogin(login);
  if (l.length < 2 || l.length > 32) return false;
  return /^[a-z0-9][a-z0-9_.-]*$/.test(l);
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((u: unknown) => {
        if (
          u &&
          typeof u === "object" &&
          "email" in u &&
          "passHash" in u &&
          typeof (u as { email: unknown }).email === "string" &&
          typeof (u as { passHash: unknown }).passHash === "string"
        ) {
          const o = u as { email: string; passHash: string; login?: string };
          const email = o.email.toLowerCase();
          const login =
            typeof o.login === "string" && o.login
              ? normalizeLogin(o.login)
              : email.split("@")[0] || "user";
          return { login, email, passHash: o.passHash };
        }
        return null;
      })
      .filter((x): x is StoredUser => x !== null);
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type SessionUser = { login: string; email: string };

export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o: unknown = JSON.parse(raw);
    if (o && typeof o === "object" && "email" in o && "login" in o) {
      const rec = o as { email: string; login: string };
      if (typeof rec.email === "string" && typeof rec.login === "string") {
        return { login: rec.login, email: rec.email };
      }
    }
    if (o && typeof o === "object" && "email" in o) {
      const rec = o as { email: string };
      if (typeof rec.email === "string") {
        return { login: rec.email.split("@")[0] || rec.email, email: rec.email };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getSessionEmail(): string | null {
  return getSessionUser()?.email ?? null;
}

export function setSession(user: StoredUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ login: user.login, email: user.email }));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function registerUser(creds: {
  login: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = creds.email.trim().toLowerCase();
  const login = normalizeLogin(creds.login);
  if (!email || !creds.password || !login) {
    return { ok: false, error: "invalid" };
  }
  if (!isValidEmailShape(email)) {
    return { ok: false, error: "invalid_email" };
  }
  if (!isValidLoginShape(creds.login)) {
    return { ok: false, error: "invalid_login" };
  }
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: "exists_email" };
  }
  if (users.some((u) => u.login === login)) {
    return { ok: false, error: "exists_login" };
  }
  const passHash = await hashPassword(creds.password);
  const user: StoredUser = { login, email, passHash };
  users.push(user);
  writeUsers(users);
  setSession(user);
  return { ok: true };
}

export async function loginUser(creds: {
  identifier: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = creds.identifier.trim();
  const pw = creds.password;
  if (!raw || !pw) {
    return { ok: false, error: "invalid" };
  }
  const passHash = await hashPassword(pw);
  const users = readUsers();
  let found: StoredUser | undefined;
  if (raw.includes("@")) {
    const e = raw.toLowerCase().trim();
    found = users.find((u) => u.email === e && u.passHash === passHash);
  } else {
    const l = normalizeLogin(raw);
    found = users.find((u) => u.login === l && u.passHash === passHash);
  }
  if (!found) {
    return { ok: false, error: "bad_credentials" };
  }
  setSession(found);
  return { ok: true };
}

export function logoutUser(): void {
  clearSession();
  clearAccessToken();
  void apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
}

/** Редирект на Spotify OAuth (ответ приходит на backend GET /auth/spotify/callback → редирект в SPA). */
export async function startSpotifyOAuthRedirect(): Promise<void> {
  const r = await fetch("/api/v1/auth/spotify/login");
  if (!r.ok) {
    throw new Error("spotify_login_url_failed");
  }
  const data = (await r.json()) as { auth_url: string };
  window.location.assign(data.auth_url);
}

export async function syncSessionFromApiMe(): Promise<void> {
  const token = getAccessToken();
  if (!token) return;
  const me = await apiRequest<{ email: string; spotify_user_id: string }>("/me");
  const login = me.spotify_user_id || me.email.split("@")[0] || "user";
  const user: StoredUser = { login, email: me.email, passHash: "oauth" };
  setSession(user);
}

export function loginWithSpotify(): { ok: true } {
  const user: StoredUser = {
    login: "spotify_user",
    email: "spotify.user@conce-music.ai",
    passHash: "spotify-oauth",
  };
  setSession(user);
  return { ok: true };
}
