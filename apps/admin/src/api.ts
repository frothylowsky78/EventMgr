import type { AgendaItem, AgendaItemCreate, AgendaItemUpdate, ApiError } from '@eventmgr/shared-types';
import { config } from './config';

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as ApiError;
    throw new Error(err?.error?.message ?? `Request failed (${res.status})`);
  }
  return (json as { data: T }).data;
}

export const adminApi = {
  listAgenda: () =>
    request<AgendaItem[]>('GET', `/admin/events/${config.eventId}/agenda`),
  createAgenda: (input: AgendaItemCreate) =>
    request<AgendaItem>('POST', `/admin/events/${config.eventId}/agenda`, input),
  updateAgenda: (id: string, patch: AgendaItemUpdate) =>
    request<AgendaItem>('PATCH', `/admin/events/${config.eventId}/agenda/${id}`, patch),
};
