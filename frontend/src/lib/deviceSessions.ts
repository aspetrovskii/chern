import { notifyProfileUpdated } from "./userProfile";

const CLIENT_ID_KEY = "conce-session-client-id";

export type DeviceSessionRow = {
  id: string;
  name: string;
  device: string;
  ip: string;
  lastSeen: number;
  clientId: string;
};

function storageKey(email: string): string {
  return `conce-sessions-${email.trim().toLowerCase()}`;
}

function readList(email: string): DeviceSessionRow[] {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return [];
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .map((x: unknown) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        if (
          typeof o.id === "string" &&
          typeof o.name === "string" &&
          typeof o.device === "string" &&
          typeof o.ip === "string" &&
          typeof o.lastSeen === "number" &&
          typeof o.clientId === "string"
        ) {
          return o as DeviceSessionRow;
        }
        return null;
      })
      .filter((x): x is DeviceSessionRow => x !== null);
  } catch {
    return [];
  }
}

function writeList(email: string, rows: DeviceSessionRow[]): void {
  localStorage.setItem(storageKey(email), JSON.stringify(rows));
  notifyProfileUpdated();
}

export function getOrCreateClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

function shortDeviceLabel(ua: string): string {
  if (!ua) return "Browser";
  const u = ua.toLowerCase();
  let os = "Desktop";
  if (u.includes("android")) os = "Android";
  else if (u.includes("iphone") || u.includes("ipad")) os = "iOS";
  else if (u.includes("mac os")) os = "macOS";
  else if (u.includes("windows")) os = "Windows";
  let br = "Browser";
  if (u.includes("edg/")) br = "Edge";
  else if (u.includes("chrome") && !u.includes("chromium")) br = "Chrome";
  else if (u.includes("firefox")) br = "Firefox";
  else if (u.includes("safari") && !u.includes("chrome")) br = "Safari";
  return `${br} · ${os}`;
}

let ipPromise: Promise<string> | null = null;

export function prefetchClientIp(): void {
  if (ipPromise) return;
  ipPromise = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4500);
      const r = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return "—";
      const j = (await r.json()) as { ip?: string };
      return typeof j.ip === "string" && j.ip.length < 64 ? j.ip : "—";
    } catch {
      return "—";
    }
  })();
}

export async function getCachedOrFetchIp(): Promise<string> {
  prefetchClientIp();
  return ipPromise ?? Promise.resolve("—");
}

export function listDeviceSessions(email: string): DeviceSessionRow[] {
  return readList(email).sort((a, b) => b.lastSeen - a.lastSeen);
}

/** Upsert current browser session; pass IP when available. */
export function touchDeviceSession(email: string, ip: string): void {
  const clientId = getOrCreateClientId();
  const device = shortDeviceLabel(typeof navigator !== "undefined" ? navigator.userAgent : "");
  const rows = readList(email);
  const now = Date.now();
  const idx = rows.findIndex((r) => r.clientId === clientId);
  if (idx >= 0) {
    rows[idx] = {
      ...rows[idx],
      device,
      ip: ip && ip !== "—" ? ip : rows[idx].ip,
      lastSeen: now,
    };
  } else {
    rows.push({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${now}`,
      name: "",
      device,
      ip: ip || "—",
      lastSeen: now,
      clientId,
    });
  }
  writeList(email, rows);
}

export function renameDeviceSession(email: string, id: string, name: string): void {
  const rows = readList(email);
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return;
  rows[i] = { ...rows[i], name: name.trim().slice(0, 80) || rows[i].name };
  writeList(email, rows);
}

export function removeDeviceSession(email: string, id: string): boolean {
  const clientId = getOrCreateClientId();
  const rows = readList(email);
  const row = rows.find((r) => r.id === id);
  if (!row) return false;
  const isCurrent = row.clientId === clientId;
  writeList(
    email,
    rows.filter((r) => r.id !== id)
  );
  return isCurrent;
}

export function isCurrentDeviceSession(email: string, sessionId: string): boolean {
  const clientId = getOrCreateClientId();
  return readList(email).some((r) => r.id === sessionId && r.clientId === clientId);
}
