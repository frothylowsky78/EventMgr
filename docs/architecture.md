# Architecture

## 1. Goals & constraints

- **Premium, simple, guest-friendly** mobile experience (Flutter, iOS + Android).
- **Backend-driven content** — admins update everything without an app release.
- **Privacy** — attendees see only their own itinerary / travel / dining / transport.
- **Serverless AWS** for low cost at ~100 attendees, with dev / staging / prod isolation.
- **Offline-first** for key read data; resilient photo upload.
- **App Store / Play Store ready** build configuration.

## 2. High-level diagram

```
                 ┌───────────────────────────── AWS account (per env) ──────────────────────────────┐
 Flutter app ──┐ │                                                                                   │
               │ │   Cognito User Pool                  ┌──────────► DynamoDB  (EventApp-{env})       │
               ├─┼─► (attendee custom-auth: email+code) │           single-table, PITR (prod)        │
 React admin ──┘ │   (admin: password + MFA)            │                                            │
               │ │            │ JWT                      │           S3 buckets (private):            │
               │ │            ▼                          │            • assets-{env}                  │
               │ │   API Gateway (HTTP API)              ├──────────► • profile-photos-{env}         │
               │ │   • Cognito JWT authorizer            │            • gallery-{env}                 │
               │ │   • CORS (admin origin)               │            • imports-{env}                 │
               │ │            │                          │            • exports-{env}                 │
               │ │            ▼                          │                                            │
               │ │   Lambda (TypeScript handlers)  ──────┤──────────► SNS / Pinpoint (APNs + FCM)     │
               │ │   • per-route functions               │                                            │
               │ │   • shared data-access layer          ├──────────► EventBridge (scheduled sends)   │
               │ │                                       │                                            │
               │ │   Cognito triggers (Lambda):          └──────────► CloudWatch (logs/metrics/alarms)│
               │ │   Define/Create/Verify auth challenge,                                             │
               │ │   PreTokenGeneration (inject attendeeId/role claims)                               │
               │ │                                                                                    │
 CloudFront ◄──┼─ S3 (admin SPA static hosting) + S3 (media via OAC, optional signed URLs)            │
               │ └────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Components

### 3.1 Mobile app (Flutter)
- **State:** Riverpod. **Routing:** GoRouter (supports notification deep links).
- **Layers:** `presentation` (screens/widgets) → `application` (Riverpod controllers) →
  `data` (repositories) → `infrastructure` (API client, local cache, secure storage).
- **Auth:** Cognito custom-auth via `amazon_cognito_identity_dart_2` (no Amplify dependency,
  keeps the binary lean). Tokens in `flutter_secure_storage`.
- **Offline:** repositories read/write a **Hive** cache; network results refresh the cache;
  UI renders from cache first (stale-while-revalidate). Cached domains: agenda, itinerary,
  travel, dining, FAQ, help contacts, static maps.
- **Theming:** event branding (logo, hero, primary/secondary colors) loaded from the event
  profile at runtime → `ThemeData` is built from backend data, not hardcoded.

### 3.2 Admin portal (React + Vite + TS)
- SPA hosted as static files on **S3 + CloudFront**. Auth via Cognito (admin group + MFA).
- Talks to the same API Gateway with the admin JWT. CORS limited to the admin origin.
- Phase 1: login + agenda CRUD. Roadmap: attendees, itineraries, travel, dining, push composer,
  photo moderation, imports/exports.

### 3.3 Backend (API Gateway + Lambda)
- **API Gateway HTTP API** (cheaper/faster than REST API) with a **JWT authorizer** bound to
  the Cognito user pool. Routes map to per-function Lambdas (small, independently deployable).
- **Authorization model:**
  - Every `/me/*` route derives `attendeeId` from the verified JWT claim `custom:attendeeId` —
    never from the request body — so an attendee can only read their own data.
  - Every `/admin/*` route requires the `event_admin` (or `super_admin`) Cognito group claim,
    enforced in a shared middleware in addition to the authorizer.
- **Shared layer** (`services/api/src/lib`): DynamoDB document client, single-table key
  helpers, response/error envelope, auth context extraction, input validation (zod).

### 3.4 Data store (DynamoDB single-table)
See [data-model.md](data-model.md). One table `EventApp-{env}` with `PK`/`SK` and `GSI1`.
On-demand billing; PITR + deletion protection on prod. Multi-event ready (`EVENT#{eventId}`
partitioning) without forcing multi-event UX now.

### 3.5 Media (S3)
- Buckets private by default; **no public ACLs**. Upload/download via **pre-signed URLs** issued
  by Lambda after authz. Photo flow: request upload URL → app PUTs to S3 → S3 event triggers a
  Lambda that creates a thumbnail + metadata record with `status=pending` (moderation default).
- Admin SPA + public assets fronted by CloudFront (OAC).

### 3.6 Push notifications
- Device token registered after login (`POST /me/device-tokens`), stored per attendee/platform.
- Admin composes in the portal → Lambda resolves the target segment → tokens → SNS/Pinpoint
  (APNs + FCM). Immediate sends fire directly; scheduled sends create an EventBridge Scheduler
  schedule that invokes the send Lambda. Every send is recorded in DynamoDB and mirrored into
  the in-app notification center.

### 3.7 Observability
- CloudWatch log groups per Lambda; API Gateway access logs; metric alarms for 5xx rate, p95
  latency, photo-processing failures, push failures. X-Ray tracing enabled. DLQs on async
  consumers. Admin content changes written to an audit-log entity.

## 4. Environments

| Concern | dev | staging | prod |
| --- | --- | --- | --- |
| CDK stack | `EventApp-dev` | `EventApp-staging` | `EventApp-prod` |
| DynamoDB | on-demand, destroy on delete | on-demand | on-demand, **PITR + retain + deletion protection** |
| S3 | auto-delete on stack destroy | retain | **versioned + retain** |
| Cognito | separate pool | separate pool | separate pool, MFA enforced for admins |
| Removal policy | DESTROY | RETAIN | RETAIN |

The mobile app and admin portal select the environment at build time via a config
(`--dart-define=ENV=...` / `VITE_ENV=...`) that points to that environment's API + Cognito IDs.

## 5. Security summary

- HTTPS only; Cognito JWT validated at the gateway **and** re-checked in handlers.
- Role-based access via Cognito groups; per-attendee data scoping from JWT claims.
- S3 private, pre-signed URLs, least-privilege IAM per Lambda.
- Secrets (weather API key, push credentials) in SSM Parameter Store / Secrets Manager.
- Admin MFA; CORS restricted to the admin origin; optional WAF on the API.
- Sensitive fields (dietary, accessibility, travel) returned only to the owner or admins.
