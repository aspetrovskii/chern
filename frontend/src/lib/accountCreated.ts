const KEY = "conce-account-created-map";

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) out[k.toLowerCase()] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function write(m: Record<string, string>): void {
  localStorage.setItem(KEY, JSON.stringify(m));
}

/** Call on successful registration (always sets creation time). */
export function setAccountCreatedAtRegister(email: string): void {
  const e = email.trim().toLowerCase();
  const m = read();
  m[e] = new Date().toISOString();
  write(m);
}

/** Call on login: only fills missing entries (legacy accounts). */
export function ensureAccountCreatedAt(email: string): void {
  const e = email.trim().toLowerCase();
  const m = read();
  if (m[e]) return;
  m[e] = new Date().toISOString();
  write(m);
}

export function getAccountCreatedAtIso(email: string): string | null {
  return read()[email.trim().toLowerCase()] ?? null;
}
