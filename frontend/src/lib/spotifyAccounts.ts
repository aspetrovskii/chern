import { notifyProfileUpdated } from "./userProfile";

export type SpotifyAccountRow = {
  id: string;
  label: string;
  connectedAt: string;
};

function key(email: string): string {
  return `conce-spotify-accounts-${email.trim().toLowerCase()}`;
}

function read(email: string): SpotifyAccountRow[] {
  try {
    const raw = localStorage.getItem(key(email));
    if (!raw) return [];
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .map((x: unknown) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        if (
          typeof o.id === "string" &&
          typeof o.label === "string" &&
          typeof o.connectedAt === "string"
        ) {
          return o as SpotifyAccountRow;
        }
        return null;
      })
      .filter((x): x is SpotifyAccountRow => x !== null);
  } catch {
    return [];
  }
}

function write(email: string, rows: SpotifyAccountRow[]): void {
  localStorage.setItem(key(email), JSON.stringify(rows));
  notifyProfileUpdated();
}

export function listSpotifyAccounts(email: string): SpotifyAccountRow[] {
  return read(email).sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
}

/** Demo: add another linked Spotify slot (no real OAuth in this flow). */
export function addSpotifyAccount(email: string): SpotifyAccountRow {
  const rows = read(email);
  const n = rows.length + 1;
  const row: SpotifyAccountRow = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `sp-${Date.now()}`,
    label: `Spotify ${n}`,
    connectedAt: new Date().toISOString(),
  };
  rows.push(row);
  write(email, rows);
  return row;
}

export function removeSpotifyAccount(email: string, id: string): void {
  write(
    email,
    read(email).filter((r) => r.id !== id)
  );
}
