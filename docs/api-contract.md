# API contract

Base URL: `https://{apiId}.execute-api.{region}.amazonaws.com` (per environment).
Auth: `Authorization: Bearer <Cognito access token>` on every route except `/health` and the
custom-auth flow (handled inside Cognito).

## Conventions

- **Success envelope:** `{ "data": <payload> }`
- **Error envelope:** `{ "error": { "code": "STRING", "message": "human readable", "details": {} } }`
- Error codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `INTERNAL`.
- Timestamps are ISO-8601 with offset. IDs are opaque strings.
- `/me/*` resolves the attendee from the JWT claim `custom:attendeeId` — body/query cannot override it.
- `/admin/*` requires Cognito group `event_admin` or `super_admin`.

## Status of each route in Phase 1

✅ implemented in the vertical slice · ⬜ contract defined, handler stubbed for later.

### Health
| | Method | Path |
| --- | --- | --- |
| ✅ | GET | `/health` |

### Attendee — self
| | Method | Path | Notes |
| --- | --- | --- | --- |
| ✅ | GET | `/me` | Full private profile of the caller |
| ✅ | GET | `/me/itinerary` | Caller's itinerary items (own only) |
| ⬜ | GET | `/me/travel` | Caller's travel detail |
| ⬜ | GET | `/me/transportation` | Caller's transport assignments |
| ⬜ | GET | `/me/dining` | Caller's dining (incl. seating) |
| ⬜ | PATCH | `/me/profile` | Update editable profile fields |
| ⬜ | POST | `/me/profile-photo/upload-url` | Pre-signed S3 upload URL |
| ⬜ | GET | `/me/notifications` | In-app notification center |
| ⬜ | PATCH | `/me/notifications/{id}/read` | Mark read |
| ⬜ | POST | `/me/device-tokens` | Register push token |
| ⬜ | DELETE | `/me/device-tokens/{id}` | Remove push token |

### Event content (attendee-readable)
| | Method | Path |
| --- | --- | --- |
| ✅ | GET | `/events/{eventId}` |
| ✅ | GET | `/events/{eventId}/agenda` |
| ⬜ | GET | `/events/{eventId}/agenda/{agendaId}` |
| ⬜ | GET | `/events/{eventId}/activities` |
| ⬜ | GET | `/events/{eventId}/dining` |
| ⬜ | GET | `/events/{eventId}/faq` |
| ⬜ | GET | `/events/{eventId}/maps` |
| ⬜ | GET | `/events/{eventId}/weather` |
| ⬜ | GET | `/events/{eventId}/announcements` |
| ⬜ | GET | `/events/{eventId}/photos` |
| ⬜ | POST | `/events/{eventId}/photos/upload-url` |
| ⬜ | POST | `/events/{eventId}/feedback` |
| ⬜ | POST | `/events/{eventId}/help-requests` |

### Admin
| | Method | Path | Notes |
| --- | --- | --- | --- |
| ✅ | GET | `/admin/events/{eventId}/agenda` | List incl. unpublished |
| ✅ | POST | `/admin/events/{eventId}/agenda` | Create agenda item |
| ✅ | PATCH | `/admin/events/{eventId}/agenda/{agendaId}` | Edit agenda item |
| ⬜ | DELETE | `/admin/events/{eventId}/agenda/{agendaId}` | Delete agenda item |
| ⬜ | PATCH | `/admin/events/{eventId}` | Edit event profile / branding |
| ⬜ | GET / PATCH | `/admin/events/{eventId}/attendees …` | Manage attendees |
| ⬜ | POST | `/admin/events/{eventId}/attendees/import` | CSV/XLSX import |
| ⬜ | POST | `/admin/events/{eventId}/notifications` | Compose push |
| ⬜ | POST | `…/notifications/{id}/send` `…/send-test` `…/cancel` `…/duplicate` | Push lifecycle |
| ⬜ | PATCH | `/admin/photos/{photoId}/approve` `…/hide` | Moderation |
| ⬜ | GET | `…/feedback/export` `…/photos/export` | Exports |

## Implemented request/response examples

### `GET /me`
```json
{ "data": {
  "id": "attendee_001", "eventId": "event_001",
  "firstName": "Jane", "lastName": "Smith", "email": "jane@example.com",
  "company": "Acme", "title": "VP", "city": "Seattle",
  "dietaryRestrictions": ["gluten-free"], "tags": ["golf"],
  "registrationStatus": "in_progress"
} }
```

### `GET /me/itinerary`
```json
{ "data": [
  { "id": "itinerary_001", "attendeeId": "attendee_001", "agendaItemId": "agenda_001",
    "customTitle": null, "startDateTime": "2026-09-12T18:00:00-07:00",
    "endDateTime": "2026-09-12T20:00:00-07:00", "locationId": "location_001",
    "notes": "", "reminderEnabled": true }
] }
```

### `GET /events/{eventId}/agenda`
```json
{ "data": [
  { "id": "agenda_001", "eventId": "event_001", "title": "Welcome Reception",
    "date": "2026-09-12", "startTime": "18:00", "endTime": "20:00",
    "category": "meal", "locationId": "location_001", "required": true }
] }
```

### `POST /admin/events/{eventId}/agenda`
Request:
```json
{ "title": "Keynote", "date": "2026-09-13", "startTime": "09:00", "endTime": "10:00",
  "category": "general_session", "description": "Opening keynote", "required": true }
```
Response `201`:
```json
{ "data": { "id": "agenda_a1b2c3", "eventId": "event_001", "title": "Keynote", "...": "..." } }
```

### `PATCH /admin/events/{eventId}/agenda/{agendaId}`
Request (partial):
```json
{ "startTime": "09:30", "locationId": "location_005" }
```
Response `200`: full updated agenda item.

See [openapi.yaml](openapi.yaml) for the machine-readable contract.
