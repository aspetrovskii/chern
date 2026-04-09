/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
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
