import type {
  AgendaItem,
  AgendaItemCreate,
  AgendaItemUpdate,
  ApiError,
  AudiencePreview,
  NotificationCreate,
  NotificationRecord,
  NotificationTarget,
  Photo,
  PhotoModeration,
  PhotoStatus,
  FaqItem,
  FaqItemCreate,
  FaqItemUpdate,
  HelpRequest,
  HelpRequestStatus,
  HelpRequestUpdate,
  DiningItem,
  DiningItemCreate,
  DiningItemUpdate,
  EventLocation,
  EventProfile,
  EventProfileUpdate,
  EventLocationCreate,
  EventLocationUpdate,
  MapLocation,
  MapLocationCreate,
  MapLocationUpdate,
  ProvisionResult,
  WeatherInfo,
  WeatherUpsert,
  Attendee,
  AttendeeUpdate,
  ItineraryItem,
  ItineraryItemCreate,
  ItineraryItemUpdate,
  TravelDetail,
  TravelDetailUpsert,
  TransportationItem,
  TransportationCreate,
  TransportationUpdate,
  UploadTicket,
} from '@eventmgr/shared-types';

interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

interface FeedbackSummary {
  targetId: string;
  count: number;
  averageRating: number;
  items: { attendeeId: string; rating: number; comments?: string; createdAt: string }[];
}
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

  // Photos (moderation)
  listPhotos: (status: PhotoStatus) =>
    request<Photo[]>('GET', `/admin/events/${ev()}/photos?status=${status}`),
  moderatePhoto: (photoId: string, patch: PhotoModeration) =>
    request<Photo>('PATCH', `/admin/events/${ev()}/photos/${photoId}`, patch),

  // FAQ
  listFaq: () => request<FaqItem[]>('GET', `/admin/events/${ev()}/faq`),
  createFaq: (input: FaqItemCreate) =>
    request<FaqItem>('POST', `/admin/events/${ev()}/faq`, input),
  updateFaq: (id: string, patch: FaqItemUpdate) =>
    request<FaqItem>('PATCH', `/admin/events/${ev()}/faq/${id}`, patch),

  // Help desk + feedback
  listHelpRequests: (status: HelpRequestStatus) =>
    request<HelpRequest[]>('GET', `/admin/events/${ev()}/help-requests?status=${status}`),
  updateHelpRequest: (attendeeId: string, requestId: string, patch: HelpRequestUpdate) =>
    request<HelpRequest>('PATCH', `/admin/events/${ev()}/help-requests/${attendeeId}/${requestId}`, patch),
  listFeedback: (targetId: string) =>
    request<FeedbackSummary>('GET', `/admin/events/${ev()}/feedback?targetId=${encodeURIComponent(targetId)}`),

  // Map images — pre-signed PUT straight to the private assets bucket
  requestMapImageUrl: (mapId: string, contentType: string) =>
    request<UploadTicket>('POST', `/admin/events/${ev()}/maps/${mapId}/image-url`, { contentType }),

  // Event profile — read via the shared endpoint, write via the admin one
  getEvent: () => request<EventProfile>('GET', `/events/${ev()}`),
  updateEvent: (patch: EventProfileUpdate) =>
    request<EventProfile>('PATCH', `/admin/events/${ev()}`, patch),

  // Locations (named places referenced by agenda + dining)
  listLocations: () => request<EventLocation[]>('GET', `/admin/events/${ev()}/locations`),
  createLocation: (input: EventLocationCreate) =>
    request<EventLocation>('POST', `/admin/events/${ev()}/locations`, input),
  updateLocation: (locationId: string, patch: EventLocationUpdate) =>
    request<EventLocation>('PATCH', `/admin/events/${ev()}/locations/${locationId}`, patch),

  // Attendees + per-attendee management
  listAttendees: () => request<Attendee[]>('GET', `/admin/events/${ev()}/attendees`),
  provisionAttendees: () =>
    request<ProvisionResult>('POST', `/admin/events/${ev()}/attendees/provision`),
  updateAttendee: (attendeeId: string, patch: AttendeeUpdate) =>
    request<Attendee>('PATCH', `/admin/events/${ev()}/attendees/${attendeeId}`, patch),
  getItinerary: (attendeeId: string) =>
    request<ItineraryItem[]>('GET', `/admin/events/${ev()}/attendees/${attendeeId}/itinerary`),
  createItinerary: (attendeeId: string, input: ItineraryItemCreate) =>
    request<ItineraryItem>('POST', `/admin/events/${ev()}/attendees/${attendeeId}/itinerary`, input),
  updateItinerary: (attendeeId: string, itemId: string, patch: ItineraryItemUpdate) =>
    request<ItineraryItem>('PATCH', `/admin/events/${ev()}/attendees/${attendeeId}/itinerary/${itemId}`, patch),
  deleteItinerary: (attendeeId: string, itemId: string) =>
    request<unknown>('DELETE', `/admin/events/${ev()}/attendees/${attendeeId}/itinerary/${itemId}`),
  getTravel: (attendeeId: string) =>
    request<TravelDetail | null>('GET', `/admin/events/${ev()}/attendees/${attendeeId}/travel`),
  upsertTravel: (attendeeId: string, input: TravelDetailUpsert) =>
    request<TravelDetail>('PUT', `/admin/events/${ev()}/attendees/${attendeeId}/travel`, input),
  getTransportation: (attendeeId: string) =>
    request<TransportationItem[]>('GET', `/admin/events/${ev()}/attendees/${attendeeId}/transportation`),
  createTransportation: (input: TransportationCreate) =>
    request<TransportationItem>('POST', `/admin/events/${ev()}/transportation`, input),
  updateTransportation: (attendeeId: string, transportId: string, patch: TransportationUpdate) =>
    request<TransportationItem>('PATCH', `/admin/events/${ev()}/transportation/${attendeeId}/${transportId}`, patch),

  // Dining
  listDining: () => request<DiningItem[]>('GET', `/admin/events/${ev()}/dining`),
  createDining: (input: DiningItemCreate) =>
    request<DiningItem>('POST', `/admin/events/${ev()}/dining`, input),
  updateDining: (id: string, patch: DiningItemUpdate) =>
    request<DiningItem>('PATCH', `/admin/events/${ev()}/dining/${id}`, patch),

  // Maps
  listMaps: () => request<MapLocation[]>('GET', `/admin/events/${ev()}/maps`),
  createMap: (input: MapLocationCreate) =>
    request<MapLocation>('POST', `/admin/events/${ev()}/maps`, input),
  updateMap: (id: string, patch: MapLocationUpdate) =>
    request<MapLocation>('PATCH', `/admin/events/${ev()}/maps/${id}`, patch),

  // Weather
  getWeather: () => request<WeatherInfo>('GET', `/events/${ev()}/weather`),
  upsertWeather: (input: WeatherUpsert) =>
    request<WeatherInfo>('PUT', `/admin/events/${ev()}/weather`, input),

  // CSV import (raw text body) + export (download)
  importAttendees: (csv: string) => importCsv(`/admin/events/${ev()}/attendees/import`, csv),
  importAgenda: (csv: string) => importCsv(`/admin/events/${ev()}/agenda/import`, csv),
  exportAttendees: () => downloadCsv(`/admin/events/${ev()}/attendees/export`, 'attendees.csv'),
  exportFeedback: (targetId: string) =>
    downloadCsv(`/admin/events/${ev()}/feedback/export?targetId=${encodeURIComponent(targetId)}`, `feedback-${targetId}.csv`),
};

async function importCsv(path: string, csv: string): Promise<ImportResult> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'text/csv',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: csv,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as ApiError)?.error?.message ?? `Import failed (${res.status})`);
  return (json as { data: ImportResult }).data;
}

async function downloadCsv(path: string, filename: string): Promise<void> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
