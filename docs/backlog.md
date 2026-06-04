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
| ✅ | Registration deadline | countdown, status, required action checklist, home banner, registration screen (event-driven) | §4.3 |
| ⬜ | Activity detail pages | full fields + images | §4.5 |
| 🟡 | Personal travel & transportation | ✅ `/me/travel`, `/me/transportation`, admin upsert/assign, transport group push segment, mobile screens; ⬜ admin UI, transport status push automation | §4.10, §4.11 |
| 🟡 | Dining | ✅ schedule, menus, dietary, private seating, `/me/dining`, admin create/edit + seat assign, dining push segment, mobile screen; ⬜ admin UI for seating grid | §4.13 |
| 🟡 | Push notifications | ✅ device tokens, in-app center, immediate + scheduled send (EventBridge), SNS publish, segments (all/tag/individuals/incomplete-reg/dining/transport); ⬜ live APNs/FCM creds, activity segment | §4.7, §18.7, §18.16 |
| 🟡 | Admin push composer | ✅ compose, audience preview, test send, send-now/scheduled, confirm (extra for urgent/all), history, duplicate, cancel, audit log; ⬜ resend-failed, export | §18.16 |
| 🟡 | Attendee yearbook | ✅ directory (visibility-filtered card projection), search, initials avatars, mobile screen; ⬜ full profile view, filters, contact opt-in display, admin photo upload | §4.8 |
| ✅ | FAQ | categories, search, featured-first, expand/collapse, admin CRUD, mobile screen | §4.9 |
| 🟡 | Maps & navigation | ✅ static map images, pins, external nav (Open in Maps), admin CRUD, mobile screen; ⬜ interactive in-app map, per-agenda/dining map deep links | §4.12 |
| 🟡 | Photos & gallery | ✅ pre-signed S3 upload, S3-trigger processor, moderation queue (approve/hide/reject/feature), gallery (grid, like, lazy-load), admin moderation UI, mobile upload (camera/library); ⬜ real thumbnailing (sharp/Object Lambda), Rekognition auto-moderation, albums UI, download/export | §4.14, §18.5 |
| ✅ | Help / concierge | contacts (tap-to-call/email), topics, help-request submit → admin triage queue (assign/resolve), admin help-content upsert | §4.15 |
| 🟡 | Feedback | ✅ form (rating/comments/recommend/anonymous), one per target, event + per-session (from agenda detail), admin list + aggregate; ⬜ CSV export, NPS dashboard | §4.16 |
| 🟡 | Weather | ✅ admin-entered current + daily forecast + alert notes, `/weather` API, mobile screen + home snapshot, admin upsert API; ⬜ live weather API integration, admin weather editor UI | §4.17 |
| 🟡 | Calendar sync | ✅ single agenda item via native add-to-calendar (add_2_calendar), full-itinerary `.ics` export endpoint; ⬜ per-itinerary add-all, change-warning on updated items | §4.18 |
| ✅ | Profile self-edit + profile photo upload | `PATCH /me/profile`, pre-signed photo upload, privacy toggles, mobile profile screen | §4.1, §4.8 |
| ✅ | Admin content mgmt + import/export | admin UIs for agenda, attendees (per-attendee itinerary/travel/transportation), dining, maps, weather, FAQ, photos, support; CSV import (attendees, agenda) + export (attendees, feedback). ⬜ XLSX (optional) | §5, §18.8 |
| ✅ | Admin: per-attendee itinerary/travel/transportation mgmt UI | Attendees tab → manage itinerary (add/edit/delete), travel (upsert), transportation (add/status) | §4.6, §5 |
| ✅ | Observability: alarms, X-Ray, audit log, DLQs, dashboard | API 5xx/latency + async-Lambda error + DLQ alarms → SNS topic; CloudWatch dashboard; X-Ray on all fns; audit-log entity; DLQs on async fns | §18.10 |
| 🟡 | Backup/retention/archive | ✅ PITR + AWS Backup plan (staging/prod), S3 versioning, restore + export runbook (`docs/backup-retention.md`). ⬜ retention-purge job (needs policy sign-off) | §18.11 |
| ⬜ | Analytics events | installs, DAU, views, opens, etc. | §10 |
| ⬜ | Accessibility pass (dynamic text, screen reader, contrast) | §8.5 |
| 🟡 | Store readiness | ✅ launcher icon + splash config & brand assets, per-env build config, native permission overlays (iOS Info.plist / Android manifest), flavor + signing snippets, full `docs/store-readiness.md` (privacy declarations + launch checklist). ⬜ final branded artwork, screenshots, signed builds, listing copy | §16, §18.15 |
| ⬜ | QA test plan execution | §14 |

## P2 — Later / optional
AI concierge, live chat, real-time presence, in-app payments, gamification, QR badge scanning,
badge printing, full event website, native tablet app, multi-event SaaS admin, rooming-list
optimization, automated flight tracking. (Spec §13.)
