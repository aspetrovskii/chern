/** Empty in dev (Vite proxy); e.g. http://127.0.0.1:8000 when SPA is served separately (Docker web). */
export function getApiV1Prefix(): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/api/v1` : "/api/v1";
}

const ACCESS_KEY = "conce-api-access-token";

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_KEY);
}

export async function apiRequest<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const h = new Headers(headers);
  const token = getAccessToken();
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
  }
  if (json !== undefined) {
    h.set("Content-Type", "application/json");
    rest.body = JSON.stringify(json);
  }
  const res = await fetch(`${getApiV1Prefix()}${path}`, { ...rest, headers: h });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (!res.ok) {
    const o = body as { error_code?: string; message?: string; detail?: string | string[] };
    const code = o?.error_code ?? `http_${res.status}`;
    let msg = typeof o?.message === "string" ? o.message : res.statusText;
    if (msg === res.statusText && o?.detail !== undefined) {
      if (typeof o.detail === "string") {
        msg = o.detail;
      } else if (Array.isArray(o.detail) && o.detail.length > 0) {
        msg = o.detail.map(String).join("; ");
      }
    }
    if (res.status === 401 || res.status === 403) {
      clearAccessToken();
      if (!window.location.hash.includes("/auth")) {
        window.location.hash = "#/auth";
      }
    }
    throw new ApiError(res.status, code, msg);
  }
  return body as T;
}
