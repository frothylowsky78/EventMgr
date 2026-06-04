# API service (Lambda + TypeScript)

Per-route Lambda handlers plus Cognito custom-auth triggers. Bundled by CDK
(`infra/`) with esbuild; each handler exports `handler`.

## Layout
```
src/
  lib/            # shared: dynamo client, key map, http envelope/auth, validation, mappers, access-code
  handlers/       # one file per route
    health.ts                 GET  /health
    getEvent.ts               GET  /events/{eventId}
    listAgenda.ts             GET  /events/{eventId}/agenda
    getMe.ts                  GET  /me
    getMyItinerary.ts         GET  /me/itinerary
    adminListAgenda.ts        GET  /admin/events/{eventId}/agenda
    adminCreateAgenda.ts      POST /admin/events/{eventId}/agenda
    adminUpdateAgenda.ts      PATCH/admin/events/{eventId}/agenda/{agendaId}
    auth/                     Cognito custom-auth + token triggers
scripts/seed.ts   # load sample event + agenda + test attendee/itinerary
```

## Build & test
```bash
npm install            # from repo root (workspaces)
npm run build -w @eventmgr/api
npm run test -w @eventmgr/api     # unit tests (access-code hashing)
```

## Local run against DynamoDB Local
```bash
# 1. Start DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# 2. Create the table (single-table + GSI1 + GSI2)
aws dynamodb create-table --endpoint-url http://localhost:8000 \
  --table-name EventApp-local \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S AttributeName=GSI2SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
    'IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}'

# 3. Seed
DYNAMODB_ENDPOINT=http://localhost:8000 TABLE_NAME=EventApp-local npm run seed -w @eventmgr/api
```

## Authorization model
- `/me/*` derives `attendeeId` from the JWT claim `custom:attendeeId` (set by the
  PreTokenGeneration trigger) — never from the request body.
- `/admin/*` requires the `event_admin` or `super_admin` Cognito group.
- All handlers return the envelope `{ data }` / `{ error: { code, message, details } }`.

## Push notifications (spec §18.16)

Ad-hoc push composer + in-app notification center are implemented:
- Attendee: `POST/DELETE /me/device-tokens`, `GET /me/notifications`, `PATCH /me/notifications/{id}/read`, `…/read-all`.
- Admin: create / preview / send / send-test / cancel / duplicate / history under `…/notifications`.
- Immediate sends publish via SNS (`createPlatformEndpoint` + `publish`) and always write an in-app
  receipt. Scheduled sends register a one-time **EventBridge Scheduler** job that invokes the
  `notificationSendJob` Lambda at `sendAt`.

The in-app center works with **no APNs/FCM setup**. To enable native push, create SNS platform
applications with your APNs key + FCM credentials, then pass the ARNs at deploy time:
```bash
npx cdk deploy --context env=prod \
  --context pushIosArn=arn:aws:sns:...:app/APNS/eventmgr-ios \
  --context pushAndroidArn=arn:aws:sns:...:app/GCM/eventmgr-android
```
Supported audience segments today: `all`, `tag`, `individuals`, `incomplete_registration`.
`activity` / `dining` / `transportation` segments land with those data slices.

## Creating the Cognito user for the seeded attendee
After `cdk deploy`, create the matching user so the seeded access code works end-to-end:
```bash
aws cognito-idp admin-create-user --user-pool-id <POOL_ID> \
  --username jane@example.com \
  --user-attributes Name=email,Value=jane@example.com Name=email_verified,Value=true \
    Name=custom:attendeeId,Value=attendee_001 Name=custom:eventId,Value=event_001 \
  --message-action SUPPRESS
# Attendees authenticate with the custom-auth flow using accessCode=VIP2026 (no password).
```
