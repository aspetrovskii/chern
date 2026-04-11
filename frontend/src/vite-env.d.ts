/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Backend origin for API (Docker web → api on another port). Empty = same origin / Vite proxy. */
  readonly VITE_API_BASE_URL?: string;
  /** When "true", `/api/v1` is served in-browser (no Python backend); Vite proxy to :8000 is disabled. */
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface Window {
  __TURNSTILE_SITE_KEY__?: string;
  turnstile?: {
    render: (el: HTMLElement, options: Record<string, unknown>) => string | number;
    reset: (id: string | number) => void;
    remove: (id: string | number) => void;
  };
}
