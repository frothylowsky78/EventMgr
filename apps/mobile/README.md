# Mobile app (Flutter)

Premium guest-facing event app for iOS + Android. Riverpod + GoRouter, offline cache via Hive,
Cognito email + access-code login. All content is backend-driven (nothing event-specific is
compiled in).

## Run
```bash
cd apps/mobile
flutter pub get
flutter run \
  --dart-define=ENV=dev \
  --dart-define=API_URL=https://xxxx.execute-api.us-west-2.amazonaws.com \
  --dart-define=USER_POOL_ID=us-west-2_xxxx \
  --dart-define=APP_CLIENT_ID=xxxx \
  --dart-define=REGION=us-west-2 \
  --dart-define=EVENT_ID=event_001
```
Values come from the `cdk deploy` stack outputs. Tip: keep them in a `--dart-define-from-file`
JSON per environment.

Seeded test login (after `npm run seed` + creating the Cognito user — see `services/api/README.md`):
`jane@example.com` / access code `VIP2026`.

## Architecture
```
lib/
  core/            config (dart-define), theme (built from backend branding)
  domain/          Event, AgendaItem, ItineraryItem (manual JSON, no codegen)
  data/
    auth/          CognitoService (CUSTOM_AUTH email+code) + secure token storage
    api_client.dart        Dio client, bearer token, { data } envelope
    local_cache.dart       Hive offline cache (stale-while-revalidate)
    repositories/          event / agenda / itinerary (network + cache)
  application/     Riverpod providers + AuthController
  presentation/    router + screens (login, home, agenda, agenda detail, my trip)
```

## Vertical slice screens
- **Login** — email + access code.
- **Home** — event hero/branding, dates, location, "Up next", quick links (offline-capable).
- **Agenda** — grouped by day, tap for detail (deep-link target `/agenda/:id`).
- **My Trip** — personal itinerary (own data only), sign out.

## Offline
Agenda, itinerary, and the event profile are cached in Hive and shown when the network fails.
(Travel, dining, FAQ, help contacts, static maps join the cache in P1.)

## Notifications

The **in-app notification center** is implemented (`/notifications`, bell with unread badge on
Home, deep-link to agenda/itinerary) and works without any push setup. Native push (APNs / FCM)
is **cut from v1** — do not add `firebase_messaging` or APNs/FCM/SNS push wiring.

## Photos & gallery

The **Photos** tab browses approved photos (3-col grid, lazy-loaded via `cached_network_image`),
supports likes, and uploads from camera or library straight to S3 via a pre-signed URL — uploads
land in the moderation queue. Required native permissions before release:
- **iOS** `Info.plist`: `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`.
- **Android**: camera permission is requested at runtime by `image_picker`.

## Store readiness
Launcher icon + splash config (`pubspec.yaml`), brand assets (`assets/icon`, `assets/splash`),
per-env build config (`config/`), and ready-to-apply native permission overlays (`store/`) are in
place. Full step-by-step (generate platforms, icons/splash, permissions, signing, privacy
declarations, launch checklist) is in **[`docs/store-readiness.md`](../../docs/store-readiness.md)**.

## Test
```bash
flutter test
```
