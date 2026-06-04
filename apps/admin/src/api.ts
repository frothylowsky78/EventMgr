import type {
  AgendaItem,
  AgendaItemCreate,
  AgendaItemUpdate,
  ApiError,
  AudiencePreview,
  NotificationCreate,
  NotificationRecord,
  NotificationTarget,
} from '@eventmgr/shared-types';
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

const ev = () => config.eventId;

export const adminApi = {
  // Agenda
  listAgenda: () => request<AgendaItem[]>('GET', `/admin/events/${ev()}/agenda`),
  createAgenda: (input: AgendaItemCreate) =>
    request<AgendaItem>('POST', `/admin/events/${ev()}/agenda`, input),
  updateAgenda: (id: string, patch: AgendaItemUpdate) =>
    request<AgendaItem>('PATCH', `/admin/events/${ev()}/agenda/${id}`, patch),

  // Notifications (ad-hoc push composer)
  listNotifications: () =>
    request<NotificationRecord[]>('GET', `/admin/events/${ev()}/notifications`),
  previewAudience: (target: NotificationTarget) =>
    request<AudiencePreview>('POST', `/admin/events/${ev()}/notifications/preview`, { target }),
  createNotification: (input: NotificationCreate) =>
    request<NotificationRecord>('POST', `/admin/events/${ev()}/notifications`, input),
  sendNotification: (id: string) =>
    request<NotificationRecord>('POST', `/admin/events/${ev()}/notifications/${id}/send`),
  sendTest: (id: string, attendeeId?: string) =>
    request<unknown>('POST', `/admin/events/${ev()}/notifications/${id}/send-test`, { attendeeId }),
  cancelNotification: (id: string) =>
    request<NotificationRecord>('POST', `/admin/events/${ev()}/notifications/${id}/cancel`),
  duplicateNotification: (id: string) =>
    request<NotificationRecord>('POST', `/admin/events/${ev()}/notifications/${id}/duplicate`),
};
