/**
 * Runtime config sourced from Vite env vars (VITE_*), which are populated per environment
 * from the matching CDK stack outputs. See README.md.
 */
export interface AdminConfig {
  env: string;
  apiUrl: string;
  region: string;
  userPoolId: string;
  adminClientId: string;
  /** The single event managed by this portal in Phase 1. */
  eventId: string;
}

export const config: AdminConfig = {
  env: import.meta.env.VITE_ENV ?? 'dev',
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  region: import.meta.env.VITE_REGION ?? 'us-west-2',
  userPoolId: import.meta.env.VITE_USER_POOL_ID ?? '',
  adminClientId: import.meta.env.VITE_ADMIN_CLIENT_ID ?? '',
  eventId: import.meta.env.VITE_EVENT_ID ?? 'event_001',
};
