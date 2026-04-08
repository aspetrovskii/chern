/**
 * Frontend-only auth: users in localStorage, SHA-256 password hashes.
 * Login: username or email. Registration: username + email + password.
 */

const USERS_KEY = "conce-auth-users";
const SESSION_KEY = "conce-auth-session";

/**
 * @typedef {{ login: string; email: string; passHash: string }} StoredUser
 */

/** @param {string} s */
function normalizeLogin(s) {
  return s.trim().toLowerCase();
}

/** @param {string} s */
function isValidEmailShape(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** @param {string} login */
function isValidLoginShape(login) {
  const l = normalizeLogin(login);
  if (l.length < 2 || l.length > 32) return false;
  return /^[a-z0-9][a-z0-9_.-]*$/.test(l);
}

/** @returns {StoredUser[]} */
function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u) => {
      if (u && typeof u.email === "string" && typeof u.passHash === "string") {
        const email = u.email.toLowerCase();
        const login =
          typeof u.login === "string" && u.login
            ? normalizeLogin(u.login)
            : email.split("@")[0] || "user";
        return { login, email, passHash: u.passHash };
      }
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/** @param {StoredUser[]} users */
function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** @param {string} password */
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** @returns {{ login: string; email: string } | null} */
export function getSessionUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (typeof o?.email === "string" && typeof o?.login === "string") {
      return { login: o.login, email: o.email };
    }
    if (typeof o?.email === "string") {
      return { login: o.email.split("@")[0] || o.email, email: o.email };
    }
    return null;
  } catch {
    return null;
  }
}

/** @returns {string | null} */
export function getSessionEmail() {
  return getSessionUser()?.email ?? null;
}

/** @param {StoredUser} user */
export function setSession(user) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ login: user.login, email: user.email })
  );
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * @param {{ login: string; email: string; password: string }} creds
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>}
 */
export async function registerUser(creds) {
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
  const user = { login, email, passHash };
  users.push(user);
  writeUsers(users);
  setSession(user);
  return { ok: true };
}

/**
 * @param {{ identifier: string; password: string }} creds
 * @returns {Promise<{ ok: true } | { ok: false; error: string }>}
 */
export async function loginUser(creds) {
  const raw = creds.identifier.trim();
  const pw = creds.password;
  if (!raw || !pw) {
    return { ok: false, error: "invalid" };
  }
  const passHash = await hashPassword(pw);
  const users = readUsers();
  /** @type {StoredUser | undefined} */
  let found;
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

export function logoutUser() {
  clearSession();
}
