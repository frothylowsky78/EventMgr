# EventMgr — Premium Event App Platform

A private, guest-facing event experience for VIP / hosted group events (~100 attendees),
with a **Flutter** mobile app (iOS + Android), a **React** admin web portal, and an
**AWS serverless** backend. All event content is backend-driven so staff can update
content without shipping a new app release.

> Built from [`docs/spec/event_app_flutter_spec.md`](docs/spec/event_app_flutter_spec.md).

## Monorepo layout

```
EventMgr/
├── apps/
│   ├── mobile/         # Flutter app (iOS + Android) — Riverpod + GoRouter + offline cache
│   └── admin/          # Admin web portal — React + Vite + TypeScript (S3 + CloudFront)
├── services/
│   └── api/            # Lambda handlers (TypeScript) + Cognito custom-auth triggers
├── infra/              # AWS CDK (TypeScript) — per-environment stacks
├── packages/
│   └── shared-types/   # Shared API contract / DTOs (TypeScript)
├── docs/               # Architecture, data model, API contract, IaC plan, backlog, open questions
└── tools/              # CSV import templates & helper scripts
```

## Architecture at a glance

```
Flutter app ┐                      ┌─ Cognito (attendee custom-auth: email+code / admin: password+MFA)
            ├─ HTTPS / JWT ─► API Gateway ─► Lambda ─► DynamoDB (single-table, multi-event ready)
React admin ┘                      │                └─► S3 (assets/profile/gallery/imports/exports)
                                   ├─► SNS / Pinpoint (APNs + FCM push)
                                   ├─► EventBridge (scheduled notifications / reminders)
                                   └─► CloudWatch (logs, metrics, alarms)
```

Three isolated environments — **dev**, **staging**, **prod** — each with its own Cognito pool,
API endpoint, DynamoDB table, S3 buckets, and config.

## Decisions locked for Phase 1

| Decision | Choice |
| --- | --- |
| Attendee auth | **Email + access code** (Cognito custom auth, passwordless for guests) |
| Admin auth | Cognito username/password + MFA, `event_admin` group |
| Infrastructure as code | **AWS CDK (TypeScript)** |
| Admin portal | **React + Vite + TypeScript** (static SPA on S3 + CloudFront) |
| Data store | DynamoDB **single-table** design, on-demand billing, multi-event ready |
| State mgmt (mobile) | Riverpod + GoRouter; offline cache via Hive |

## Phase 1 vertical slice (implemented in this foundation)

1. Secure attendee login (email + access code)
2. Home dashboard (event profile + "what's next", fully backend-driven)
3. Event profile/config loading from backend
4. Agenda list (by day, with detail)
5. Personal itinerary view (own data only)
6. Admin portal login
7. Admin create / edit agenda items

See [`docs/vertical-slice.md`](docs/vertical-slice.md) for the slice plan and
[`docs/backlog.md`](docs/backlog.md) for the full backlog.

## Getting started

| Component | Quickstart |
| --- | --- |
| Backend (CDK) | [`infra/README.md`](infra/README.md) |
| API (Lambda) | [`services/api/README.md`](services/api/README.md) |
| Admin portal | [`apps/admin/README.md`](apps/admin/README.md) |
| Mobile app | [`apps/mobile/README.md`](apps/mobile/README.md) |

```bash
npm install            # install all TS workspaces
npm run build          # build shared-types, api, infra, admin
```

## Documentation index

- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [API contract](docs/api-contract.md) · [OpenAPI](docs/openapi.yaml)
- [Infrastructure-as-code plan](docs/iac-plan.md)
- [CI/CD (CodePipeline)](docs/cicd.md)
- [Backup, retention & archive](docs/backup-retention.md)
- [App Store / Play readiness](docs/store-readiness.md)
- [Development backlog](docs/backlog.md)
- [Vertical-slice plan](docs/vertical-slice.md)
- [Open questions & assumptions](docs/open-questions.md)
