const API_PREFIX = "/api/v1";

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
  const res = await fetch(`${API_PREFIX}${path}`, { ...rest, headers: h });
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
    const o = body as { error_code?: string; message?: string };
    const code = o?.error_code ?? `http_${res.status}`;
    const msg = typeof o?.message === "string" ? o.message : res.statusText;
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
