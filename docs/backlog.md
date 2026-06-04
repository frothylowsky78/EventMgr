# Development backlog

Derived from the spec. **P0** = Phase-1 vertical slice (this foundation). **P1** = remainder of
V1 scope. **P2** = spec "optional/later". Each epic lists the spec section(s) it covers.

## Legend
- ✅ done in this foundation · 🟡 scaffolded / partial · ⬜ not started

## P0 — Vertical slice (foundation)
| Status | Item | Spec |
| --- | --- | --- |
| ✅ | Monorepo + IaC scaffold (CDK), dev/staging/prod config | §18.2, §18.9 |
| ✅ | DynamoDB single-table + key helpers + seed | §18.4 |
| ✅ | Cognito user pool + groups + custom-auth (email+code) triggers | §4.1, §18.3 |
| ✅ | API: `/me`, `/me/itinerary`, `/events/{id}`, `/events/{id}/agenda` | §18.6 |
| ✅ | Admin API: agenda list/create/edit | §18.6, §5 |
| ✅ | Flutter app shell: login, home dashboard, agenda, itinerary, offline cache | §4.1–4.6 |
| ✅ | Admin portal: login + agenda CRUD | §18.8 |
| ✅ | Docs: architecture, data model, API contract, OpenAPI, IaC, open questions | §16, §18.14 |

## P1 — Remaining V1 scope
| Status | Epic | Key items | Spec |
| --- | --- | --- | --- |
| ⬜ | Registration deadline | countdown, status, required action items | §4.3 |
| ⬜ | Activity detail pages | full fields + images | §4.5 |
| ⬜ | Personal travel & transportation | `/me/travel`, `/me/transportation`, admin assign | §4.10, §4.11 |
| ⬜ | Dining | schedule, menus, seating, dietary (private) | §4.13 |
| ⬜ | Push notifications | device tokens, SNS/Pinpoint, segments, scheduled, in-app center | §4.7, §18.7, §18.16 |
| ⬜ | Admin push composer | targeting, preview, test send, confirm, history, audit | §18.16 |
| ⬜ | Attendee yearbook | directory, search/filter, privacy projections | §4.8 |
| ⬜ | FAQ | categories, search, featured | §4.9 |
| ⬜ | Maps & navigation | static/interactive, pins, external nav links | §4.12 |
| ⬜ | Photos & gallery | pre-signed upload, thumbnails, moderation, albums | §4.14, §18.5 |
| ⬜ | Help / concierge | contacts, help requests → admin | §4.15 |
| ⬜ | Feedback | forms attached to items, one per item, export | §4.16 |
| ⬜ | Weather | live API or admin notes, alerts | §4.17 |
| ⬜ | Calendar sync | single item + full itinerary (ICS), timezone-correct | §4.18 |
| ⬜ | Profile self-edit + profile photo upload | `PATCH /me/profile`, upload URL | §4.1, §4.8 |
| ⬜ | Admin: attendees, itineraries, travel, dining mgmt + CSV/XLSX import/export | §5, §18.8 |
| ⬜ | Observability: alarms, X-Ray, audit log, DLQs | §18.10 |
| ⬜ | Backup/retention/archive procedures | §18.11 |
| ⬜ | Analytics events | installs, DAU, views, opens, etc. | §10 |
| ⬜ | Accessibility pass (dynamic text, screen reader, contrast) | §8.5 |
| ⬜ | Store readiness: icons, splash, privacy manifests, store listings | §16 |
| ⬜ | QA test plan execution | §14 |

## P2 — Later / optional
AI concierge, live chat, real-time presence, in-app payments, gamification, QR badge scanning,
badge printing, full event website, native tablet app, multi-event SaaS admin, rooming-list
optimization, automated flight tracking. (Spec §13.)
