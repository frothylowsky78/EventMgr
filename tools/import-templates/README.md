# Data import templates

CSV templates for the admin bulk-import endpoints (§5, §18.8). XLSX/JSON variants accepted too.

| File | Imports via | Notes |
| --- | --- | --- |
| `attendees.csv` | `POST /admin/events/{eventId}/attendees/import` | `accessCode` is hashed on import; multi-value fields use `;` |
| `agenda.csv` | `POST /admin/events/{eventId}/agenda/import` | `category` ∈ general_session, meal, activity, transportation, free_time, optional_event, private_appointment |

Conventions:
- Multi-value cells (dietaryRestrictions, tags, eligibleTags) are `;`-separated.
- Booleans are `true` / `false`. Empty cells are treated as unset.
- Times are 24h `HH:mm`; dates are `YYYY-MM-DD` in the event timezone.

> The import endpoints are P1 (see `docs/backlog.md`); these templates define the expected shape now
> so attendee/agenda data can be prepared in parallel.
