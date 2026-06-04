# First vertical slice — implementation plan

Goal: a thin, end-to-end path proving the whole architecture works — login → backend-driven
content → personalized private data → admin editing that shows up in the app.

## Scope
1. **Secure attendee login** — email + access code (Cognito custom auth).
2. **Home dashboard** — event name/dates/location/branding + "what's next".
3. **Event profile/config loading** from backend (no hardcoded event data).
4. **Agenda list** — by day, tap for detail.
5. **Personal itinerary** — caller's own items only.
6. **Admin portal login** — Cognito admin group.
7. **Admin create/edit agenda items** — changes appear in the app on refresh.

## End-to-end flow
```
Attendee opens app
  → enters email + access code
  → Cognito CUSTOM_AUTH (Define/Create/Verify challenge Lambdas) validates code from DynamoDB
  → PreTokenGeneration injects custom:attendeeId + role into JWT
  → app stores tokens (secure storage)
  → Home: GET /events/{id}  +  GET /me/itinerary  (cached in Hive for offline)
  → Agenda: GET /events/{id}/agenda
Admin opens portal
  → Cognito password (+MFA on prod) login, event_admin group
  → GET /admin/events/{id}/agenda
  → POST/PATCH agenda → DynamoDB → visible to attendees on next fetch
```

## Components built
| Layer | Artifacts |
| --- | --- |
| Shared types | `packages/shared-types` — Event, AgendaItem, ItineraryItem, Attendee, envelopes |
| Infra | `infra/` CDK: DataStore, Auth (+custom-auth triggers), Api, Functions, Web, config |
| API | `services/api/src/handlers/*` for the 7 routes + Cognito triggers + shared lib |
| Seed | `services/api/scripts/seed.ts` — one event, sample agenda, one attendee + itinerary + access code |
| Mobile | `apps/mobile` — login, home, agenda (list+detail), itinerary screens; API client; Hive cache; theming-from-backend |
| Admin | `apps/admin` — login, agenda list, create/edit form |

## Acceptance (maps to spec §14)
- Valid attendee logs in; invalid/disabled cannot (`Login` scenarios).
- Agenda loads by day; detail opens (`Agenda`).
- Attendee sees only their own itinerary; correct timezone (`Personal Itinerary`).
- Admin edits agenda; change appears in app after refresh (§5 acceptance).
- Event content is 100% backend-driven (no event data compiled into the app).

## How to run the slice locally
1. `cd infra && npm i && npx cdk deploy EventApp-dev --context env=dev` (needs AWS creds).
2. `cd services/api && npm i && npm run seed -- --env dev` to load sample data + a test attendee/code.
3. Admin: `cd apps/admin && npm i && VITE_ENV=dev npm run dev`.
4. Mobile: `cd apps/mobile && flutter run --dart-define=ENV=dev`.

Without AWS creds you can still build/typecheck every TS workspace (`npm run build`) and run the
API handlers against **DynamoDB Local** (see `services/api/README.md`).
