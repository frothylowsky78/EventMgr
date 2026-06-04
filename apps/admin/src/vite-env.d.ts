/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENV?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_REGION?: string;
  readonly VITE_USER_POOL_ID?: string;
  readonly VITE_ADMIN_CLIENT_ID?: string;
  readonly VITE_EVENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
