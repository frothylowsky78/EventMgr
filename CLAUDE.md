# CLAUDE.md — EventMgr

Private, guest-facing app for ONE corporate event (~100 attendees) at Coeur d'Alene,
**September 15 2026**. Flutter mobile + React admin portal + AWS serverless backend.

## Read this first

This codebase was AI-generated and committed in a single upload — never compiled,
synthesized, or deployed before it landed. **Every defect found so far has been the same
class: configuration written but never executed.** Assume anything unverified is broken.

- Run the build / synth / analyze command and read the output before claiming it works.
- Never report a result you did not observe.

## Layout

- `apps/mobile/` — Flutter (Riverpod + GoRouter, Hive offline cache, Dio, Cognito custom auth)
- `apps/admin/` — React + Vite + TS SPA (S3 + CloudFront)
- `services/api/` — one Lambda handler per route + Cognito custom-auth triggers (`src/handlers/`)
- `infra/` — AWS CDK; `lib/event-app-stack.ts` composes `lib/constructs/*`
- `packages/shared-types/` — DTOs shared by api + admin. Build this FIRST; both depend on `dist/`.
- `docs/` — architecture, data model, API contract, `docs/spec/` is the source spec
- root `package.json` — npm workspaces: admin/api/infra/shared-types. Mobile is outside them.

## Commands

```bash
npm install && npm run build          # workspaces; shared-types must build first
npm run typecheck -w @eventmgr/api
cd infra && npx cdk synth  --context env=dev
cd infra && npx cdk deploy --context env=dev
```

`flutter` is not on PATH in a non-interactive shell:

```bash
export PATH="$HOME/develop/flutter/bin:$PATH"
cd apps/mobile && flutter analyze
flutter run --dart-define-from-file=config/dev.json
```

## Environment (local macOS)

Flutter 3.47.2 / Dart 3.13.2 · Xcode 26.6 · Android SDK 36 · Node 24 · CocoaPods via Homebrew.
AWS `default` profile → account **418253154851**, **us-west-2**. Lambdas run NODEJS_20_X on ARM64
and CI (`buildspec.yml`) pins Node 20 — local Node 24 is newer than both.

## Hard constraints

- **Android targets API 36** (Play requirement, Aug 31 2026). Inherited from Flutter's defaults
  via `flutter.targetSdkVersion`/`compileSdkVersion` in `android/app/build.gradle.kts` — do not
  pin these to a literal without checking what Flutter resolves to.
- **iOS builds against the iOS 26 SDK or later.** (`IPHONEOS_DEPLOYMENT_TARGET` is 15.0 — that's
  the floor, not the SDK; leave it alone.)
- **Push notifications are CUT from v1.** Do not add `firebase_messaging`, APNs, FCM, or SNS push
  wiring. Note: backend push scaffolding already exists and is dormant (`grants.ts:grantPush`,
  `notificationSendJob`, `/me/device-tokens`, empty `pushPlatformAppArn*`). Leave it dormant —
  don't delete it, don't light it up. The in-app notification center is separate and stays.
- **Prod build only.** Do not add dev/staging/prod Gradle flavors. There are none today.
  (`infra/lib/config.ts`'s three *CDK environments* are unrelated and legitimate; the
  `staging`/`prod` `.example.json` files stay — prod is coming.)
- **Do not upgrade `pubspec.yaml` packages without asking.** The pins are old but working; churn
  is the main risk this close to the event.

## Backend state

Dev stack deployed. Prod stack **not** deployed. DynamoDB seeded with `event_001` and test
attendee `jane@example.com` / access code `VIP2026`; admin user `admin@example.com`.
Seed content (`services/api/scripts/seed.ts`) is generic placeholder data — "VIP Summit 2026",
Big Sur — not the real event.

Config files are git-ignored and exist only locally: `apps/mobile/config/dev.json`,
`apps/admin/.env.development`. Only the `*.example.json` / `.env.example` templates are committed.

## Constraints already paid for — don't re-break

- **CloudFormation caps a stack at 500 resources.** All `/admin/*` routes live in `AdminApi`, a
  NestedStack (`infra/lib/constructs/admin-api.ts`), to stay under it. Adding endpoints risks
  re-crossing the limit — synth and check before assuming it fits.
- **The mobile app must send the Cognito ID token, not the access token.** The API Gateway JWT
  authorizer validates `aud`; access tokens carry `client_id` instead. `CognitoService
  .currentAccessToken()` deliberately returns the *ID* token (name and the doc comment in
  `api_client.dart` are both stale).
- **Detail routes use `context.push`, not `context.go`,** so the back button works. Only
  `/home`, `/agenda`, `/itinerary` render `HomeShell` (5 tabs: Home · Agenda · My Trip ·
  Photos · More).

## Known suspect (unverified — do not fix blind)

`apps/admin/src/App.tsx:50,58` sends `accessToken` to the API — the same bug fixed for mobile in
`89f87e6`. Untested against the deployed API. Cheap to check: `npm run dev -w @eventmgr/admin`,
log in at localhost:5173, see whether data loads — if it 401s, same fix, same reason. Before prod.

## Working style

- **Commit directly to `main`.** No branches, no PRs unless asked.
- **Minimal change that fixes the stated problem.** Don't fix adjacent warnings, deprecations,
  or unused imports unless asked.
- **If a fix needs a second approach after the first fails, stop and report.** Don't try a third.
