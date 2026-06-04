# Data model — DynamoDB single-table design

**Table:** `EventApp-{env}` · billing: on-demand · keys: `PK` (partition), `SK` (sort).

**Indexes**
- **GSI1** (`GSI1PK`, `GSI1SK`) — "list content of a type for an event", "list an event's attendees".
- **GSI2** (`GSI2PK`, `GSI2SK`) — lookups by alternate key (e.g. attendee by email, access-code resolution, device tokens by attendee).

> Multi-event ready: every event-scoped item is partitioned under `EVENT#{eventId}`; attendee-owned
> private data is partitioned under `ATTENDEE#{attendeeId}`. Adding a second event needs no schema change.

## Entity key map

| Entity | PK | SK | GSI1PK / GSI1SK | GSI2PK / GSI2SK |
| --- | --- | --- | --- | --- |
| Event profile | `EVENT#{eventId}` | `PROFILE` | — | — |
| Agenda item | `EVENT#{eventId}` | `AGENDA#{agendaId}` | `EVENT#{eventId}#AGENDA` / `{date}#{startTime}#{agendaId}` | — |
| Activity | `EVENT#{eventId}` | `ACTIVITY#{activityId}` | `EVENT#{eventId}#ACTIVITY` / `{title}` | — |
| Dining item | `EVENT#{eventId}` | `DINING#{diningId}` | `EVENT#{eventId}#DINING` / `{date}#{startTime}#{diningId}` | — |
| FAQ | `EVENT#{eventId}` | `FAQ#{faqId}` | `EVENT#{eventId}#FAQ` / `{category}#{order}` | — |
| Map | `EVENT#{eventId}` | `MAP#{mapId}` | `EVENT#{eventId}#MAP` / `{order}` | — |
| Announcement | `EVENT#{eventId}` | `ANNOUNCE#{ts}#{id}` | `EVENT#{eventId}#ANNOUNCE` / `{ts}` | — |
| Photo (metadata) | `EVENT#{eventId}` | `PHOTO#{photoId}` | `EVENT#{eventId}#PHOTO#{status}` / `{createdAt}` | `ALBUM#{albumId}` / `{createdAt}` |
| Notification | `EVENT#{eventId}` | `NOTIF#{notificationId}` | `EVENT#{eventId}#NOTIF` / `{createdAt}` | — |
| Attendee profile | `ATTENDEE#{attendeeId}` | `PROFILE` | `EVENT#{eventId}#ATTENDEE` / `{lastName}#{firstName}` | `EMAIL#{emailLower}` / `ATTENDEE` |
| Itinerary item | `ATTENDEE#{attendeeId}` | `ITINERARY#{startDateTime}#{itemId}` | — | — |
| Travel detail | `ATTENDEE#{attendeeId}` | `TRAVEL` | — | — |
| Transportation | `ATTENDEE#{attendeeId}` | `TRANSPORT#{transportId}` | `EVENT#{eventId}#TRANSPORT#{group}` / `{pickupDateTime}` | — |
| Device token | `ATTENDEE#{attendeeId}` | `DEVICE#{tokenId}` | — | `EVENT#{eventId}#DEVICE` / `{attendeeId}` |
| Feedback | `ATTENDEE#{attendeeId}` | `FEEDBACK#{targetId}` | `EVENT#{eventId}#FEEDBACK#{targetId}` / `{createdAt}` | — |
| Help request | `ATTENDEE#{attendeeId}` | `HELP#{requestId}` | `EVENT#{eventId}#HELP#{status}` / `{createdAt}` | — |
| Notification receipt | `ATTENDEE#{attendeeId}` | `NOTIFRX#{notificationId}` | — | — |
| Access code | `EVENT#{eventId}` | `ACCESSCODE#{codeHash}` | — | `CODE#{codeHash}` / `EVENT#{eventId}` |
| Audit log | `EVENT#{eventId}` | `AUDIT#{ts}#{id}` | `EVENT#{eventId}#AUDIT` / `{ts}` | — |

## Core access patterns

| # | Pattern | Query |
| --- | --- | --- |
| 1 | Load event profile | `GetItem PK=EVENT#{id}, SK=PROFILE` |
| 2 | List agenda by day/time | `Query GSI1 GSI1PK=EVENT#{id}#AGENDA` (sorted by `date#startTime`) |
| 3 | Get one agenda item | `GetItem PK=EVENT#{id}, SK=AGENDA#{aid}` |
| 4 | My itinerary (own only) | `Query PK=ATTENDEE#{me}, SK begins_with ITINERARY#` |
| 5 | My travel / transport | `Query PK=ATTENDEE#{me}, SK begins_with TRAVEL/TRANSPORT#` |
| 6 | Attendee by email (auth) | `Query GSI2 GSI2PK=EMAIL#{email}` |
| 7 | List attendees (admin) | `Query GSI1 GSI1PK=EVENT#{id}#ATTENDEE` (sorted by name) |
| 8 | Gallery (approved) | `Query GSI1 GSI1PK=EVENT#{id}#PHOTO#approved` |
| 9 | Resolve push segment | `Query GSI1 GSI1PK=EVENT#{id}#ATTENDEE` + filter on tags, then tokens |
| 10 | Notification history (admin) | `Query GSI1 GSI1PK=EVENT#{id}#NOTIF` |

## Canonical JSON shapes

These match the shared TypeScript types in `packages/shared-types` and the Dart models in
`apps/mobile/lib/domain`. Storage attributes (`PK`/`SK`/`GSI*`) are internal; the API returns the
clean domain shape below.

### Event
```json
{
  "id": "event_001",
  "name": "VIP Event",
  "startDate": "2026-09-12",
  "endDate": "2026-09-15",
  "locationName": "Event Resort",
  "address": "123 Main Street",
  "timezone": "America/Los_Angeles",
  "registrationDeadline": "2026-08-15T23:59:00-07:00",
  "branding": { "logoUrl": "", "heroImageUrl": "", "primaryColor": "#1A2B4C", "secondaryColor": "#C9A227" }
}
```

### Attendee
```json
{
  "id": "attendee_001", "eventId": "event_001",
  "firstName": "Jane", "lastName": "Smith", "email": "jane@example.com",
  "phone": "", "company": "", "title": "", "city": "",
  "profilePhotoUrl": "", "dietaryRestrictions": ["gluten-free"],
  "accessibilityNeeds": "", "guestName": "",
  "directoryVisible": true, "contactSharingOptIn": false,
  "registrationStatus": "in_progress", "tags": ["golf", "early_arrival"], "enabled": true
}
```
> `dietaryRestrictions`, `accessibilityNeeds`, `phone` are **private** — returned only to the owner
> (`/me`) or to admins, never in the public yearbook projection.

### Agenda item
```json
{
  "id": "agenda_001", "eventId": "event_001", "title": "Welcome Reception",
  "date": "2026-09-12", "startTime": "18:00", "endTime": "20:00",
  "locationId": "location_001", "category": "meal", "description": "",
  "speaker": "", "dressCode": "Resort casual", "mapLink": "",
  "required": true, "capacity": null, "eligibleTags": [], "reminderEnabled": true
}
```

### Itinerary item
```json
{
  "id": "itinerary_001", "attendeeId": "attendee_001", "agendaItemId": "agenda_001",
  "customTitle": "", "startDateTime": "2026-09-12T18:00:00-07:00",
  "endDateTime": "2026-09-12T20:00:00-07:00", "locationId": "location_001",
  "notes": "", "transportationNote": "", "reminderEnabled": true, "visibility": "private"
}
```

(Dining, Travel, Photo, Notification, DeviceToken shapes mirror the spec §6 / §18.16 and are
defined in `packages/shared-types`.)
