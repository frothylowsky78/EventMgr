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
| ✅ | GET | `/me/travel` | Caller's travel detail (null if none) |
| ✅ | GET | `/me/transportation` | Caller's transport assignments |
| ✅ | GET | `/me/dining` | Caller's dining (incl. seating) |
| ⬜ | PATCH | `/me/profile` | Update editable profile fields |
| ⬜ | POST | `/me/profile-photo/upload-url` | Pre-signed S3 upload URL |
| ✅ | GET | `/me/notifications` | In-app notification center (`{ items, unread }`) |
| ✅ | PATCH | `/me/notifications/{id}/read` | Mark read |
| ✅ | PATCH | `/me/notifications/read-all` | Mark all read |
| ✅ | POST | `/me/device-tokens` | Register push token |
| ✅ | DELETE | `/me/device-tokens/{id}` | Remove push token |

### Event content (attendee-readable)
| | Method | Path |
| --- | --- | --- |
| ✅ | GET | `/events/{eventId}` |
| ✅ | GET | `/events/{eventId}/agenda` |
| ⬜ | GET | `/events/{eventId}/agenda/{agendaId}` |
| ⬜ | GET | `/events/{eventId}/activities` |
| ✅ | GET | `/events/{eventId}/dining` |
| ✅ | GET | `/events/{eventId}/faq` |
| ✅ | GET | `/events/{eventId}/attendees` (yearbook, card projection) |
| ⬜ | GET | `/events/{eventId}/maps` |
| ✅ | GET | `/events/{eventId}/weather` |
| ⬜ | GET | `/events/{eventId}/announcements` |
| ✅ | GET | `/events/{eventId}/photos` (approved, pre-signed URLs) |
| ✅ | POST | `/events/{eventId}/photos/upload-url` |
| ✅ | POST | `/events/{eventId}/photos/{photoId}/like` |
| ✅ | DELETE | `/events/{eventId}/photos/{photoId}` (owner/admin) |
| ✅ | POST | `/events/{eventId}/feedback` |
| ✅ | GET | `/me/feedback-submissions` |
| ✅ | GET | `/events/{eventId}/help` (contacts/topics) |
| ✅ | POST | `/events/{eventId}/help-requests` |
| ✅ | GET | `/me/help-requests` |

### Admin
| | Method | Path | Notes |
| --- | --- | --- | --- |
| ✅ | GET | `/admin/events/{eventId}/agenda` | List incl. unpublished |
| ✅ | POST | `/admin/events/{eventId}/agenda` | Create agenda item |
| ✅ | PATCH | `/admin/events/{eventId}/agenda/{agendaId}` | Edit agenda item |
| ⬜ | DELETE | `/admin/events/{eventId}/agenda/{agendaId}` | Delete agenda item |
| ✅ | GET/POST/PATCH | `/admin/events/{eventId}/dining …` | Dining list / create / edit |
| ✅ | POST | `/admin/events/{eventId}/dining/{diningId}/seats` | Assign personal seat |
| ✅ | PUT | `/admin/events/{eventId}/attendees/{attendeeId}/travel` | Upsert travel detail |
| ✅ | POST | `/admin/events/{eventId}/transportation` | Assign transportation |
| ✅ | PATCH | `/admin/events/{eventId}/transportation/{attendeeId}/{transportId}` | Update transportation |
| ⬜ | PATCH | `/admin/events/{eventId}` | Edit event profile / branding |
| ⬜ | GET / PATCH | `/admin/events/{eventId}/attendees …` | Manage attendees |
| ⬜ | POST | `/admin/events/{eventId}/attendees/import` | CSV/XLSX import |
| ✅ | GET | `/admin/events/{eventId}/notifications` | History (newest first) |
| ✅ | POST | `/admin/events/{eventId}/notifications` | Compose (creates draft) |
| ✅ | POST | `…/notifications/preview` | Audience count + description |
| ✅ | GET | `…/notifications/{id}` | Notification detail |
| ✅ | POST | `…/notifications/{id}/send` | Send now or register schedule |
| ✅ | POST | `…/notifications/{id}/send-test` | Test send to self/test attendee |
| ✅ | POST | `…/notifications/{id}/cancel` | Cancel draft/scheduled |
| ✅ | POST | `…/notifications/{id}/duplicate` | Clone to new draft |
| ✅ | GET | `/admin/events/{eventId}/photos?status=` | Moderation queue by status |
| ✅ | PATCH | `/admin/events/{eventId}/photos/{photoId}` | Approve / hide / reject / feature / album |
| ✅ | GET/POST/PATCH | `/admin/events/{eventId}/faq …` | FAQ list / create / edit |
| ✅ | PUT | `/admin/events/{eventId}/weather` | Upsert weather snapshot + notes |
| ✅ | GET | `/admin/events/{eventId}/feedback?targetId=` | Feedback list + aggregate |
| ✅ | PUT | `/admin/events/{eventId}/help` | Upsert help contacts/topics |
| ✅ | GET | `/admin/events/{eventId}/help-requests?status=` | Help triage queue |
| ✅ | PATCH | `/admin/events/{eventId}/help-requests/{attendeeId}/{requestId}` | Assign / resolve |
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
