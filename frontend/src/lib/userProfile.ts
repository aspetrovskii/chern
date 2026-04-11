const AVATAR_KEY = "conce-user-avatar";
const PROFILE_TEXT_KEY = "conce-profile-text";

export type ProfileTextFields = { displayName: string; bio: string };

function readProfileText(): ProfileTextFields {
  try {
    const raw = localStorage.getItem(PROFILE_TEXT_KEY);
    if (!raw) return { displayName: "", bio: "" };
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object") return { displayName: "", bio: "" };
    const o = p as Record<string, unknown>;
    const displayName = typeof o.displayName === "string" ? o.displayName.slice(0, 80) : "";
    const bio = typeof o.bio === "string" ? o.bio.slice(0, 500) : "";
    return { displayName, bio };
  } catch {
    return { displayName: "", bio: "" };
  }
}

export function getProfileTextFields(): ProfileTextFields {
  return readProfileText();
}

/** ~350 KB file → data URL can grow; cap stored string length */
const MAX_STORED_AVATAR_CHARS = 480_000;

export function notifyProfileUpdated(): void {
  window.dispatchEvent(new Event("conce-profile-updated"));
}

export function setProfileTextFields(patch: Partial<ProfileTextFields>): void {
  const cur = readProfileText();
  const next: ProfileTextFields = {
    displayName:
      patch.displayName !== undefined ? patch.displayName.slice(0, 80) : cur.displayName,
    bio: patch.bio !== undefined ? patch.bio.slice(0, 500) : cur.bio,
  };
  localStorage.setItem(PROFILE_TEXT_KEY, JSON.stringify(next));
  notifyProfileUpdated();
}

export function getStoredAvatarDataUrl(): string | null {
  try {
    const s = localStorage.getItem(AVATAR_KEY);
    if (!s || !s.startsWith("data:image/")) return null;
    if (s.length > MAX_STORED_AVATAR_CHARS) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearStoredAvatar(): void {
  localStorage.removeItem(AVATAR_KEY);
  notifyProfileUpdated();
}

export function setStoredAvatarFromFile(
  file: File
): Promise<{ ok: true } | { ok: false; error: "type" | "size" | "read" }> {
  if (!file.type.startsWith("image/")) {
    return Promise.resolve({ ok: false, error: "type" });
  }
  if (file.size > 360 * 1024) {
    return Promise.resolve({ ok: false, error: "size" });
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url.startsWith("data:image/") || url.length > MAX_STORED_AVATAR_CHARS) {
        resolve({ ok: false, error: "size" });
        return;
      }
      localStorage.setItem(AVATAR_KEY, url);
      notifyProfileUpdated();
      resolve({ ok: true });
    };
    reader.onerror = () => resolve({ ok: false, error: "read" });
    reader.readAsDataURL(file);
  });
}

export function getInitials(login: string, email: string): string {
  const raw = (login || email || "?").trim();
  const parts = raw.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return (a + b).toUpperCase().slice(0, 2) || "?";
  }
  return raw.slice(0, 2).toUpperCase() || "?";
}
