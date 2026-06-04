# Admin portal (React + Vite + TypeScript)

Static SPA for event staff. Phase 1: Cognito admin login + agenda create/edit. Hosted on
S3 + CloudFront (see `infra/lib/constructs/web.ts`).

## Setup
```bash
npm install                     # from repo root (workspaces)
cp apps/admin/.env.example apps/admin/.env.development   # fill from `cdk deploy` outputs
npm run dev -w @eventmgr/admin  # http://localhost:5173
```

## Env vars (from CDK stack outputs)
| Var | Output |
| --- | --- |
| `VITE_API_URL` | `ApiUrl` |
| `VITE_USER_POOL_ID` | `UserPoolId` |
| `VITE_ADMIN_CLIENT_ID` | `AdminClientId` |
| `VITE_REGION` | `Region` |
| `VITE_EVENT_ID` | the managed event id (default `event_001`) |

## Build & deploy
```bash
VITE_ENV=prod npm run build -w @eventmgr/admin
aws s3 sync apps/admin/dist s3://event-app-admin-prod --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths '/*'
```

## Structure
```
src/
  config.ts                 # VITE_* runtime config
  auth.ts                   # Cognito SRP login (+ NEW_PASSWORD_REQUIRED), session, role check
  api.ts                    # fetch wrapper with bearer token; admin agenda endpoints
  App.tsx                   # session gate + shell
  components/
    Login.tsx
    AgendaPage.tsx          # list
    AgendaForm.tsx          # create / edit
```

## Roadmap
Attendees, itineraries, travel, dining, push composer (§18.16), photo moderation, imports/exports.
