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
aws s3 sync apps/admin/dist s3://event-app-admin-prod --delete \
  --exclude "branding/*" --exclude "privacy.html"
aws cloudfront create-invalidation --distribution-id <ID> --paths '/*'
```

## Branding assets (`/branding`)

Event images — the Home-screen hero and the brand logo — live in the admin bucket under
`branding/`, not in git. They are content, they change per event, and a few hundred KB of
binary has no business in a repo that CI clones on every build.

They are served by the same CloudFront distribution as the portal, so they need no bucket
policy of their own and no second distribution:

| Asset | URL |
| --- | --- |
| Hero | `https://dbhn28eq3w6cv.cloudfront.net/branding/hero.jpg` |
| Logo | `https://dbhn28eq3w6cv.cloudfront.net/branding/logo.png` |

Paste those into **Event → Branding** in the portal; they are stored on the event record as
`branding.heroImageUrl` / `branding.logoUrl` and read by the mobile Home screen.

Uploading a replacement:

```bash
# Hero: JPEG, max 1600px on the long edge, quality ~85
sips -s format jpeg -Z 1600 -s formatOptions 85 <source> --out hero.jpg
aws s3 cp hero.jpg s3://event-app-admin-prod/branding/hero.jpg \
  --content-type image/jpeg --cache-control "public, max-age=86400"

# Logo: keep the source format; PNG preserves transparency
aws s3 cp logo.png s3://event-app-admin-prod/branding/logo.png \
  --content-type image/png --cache-control "public, max-age=86400"

# max-age is a day, so invalidate when replacing an existing file
aws cloudfront create-invalidation --distribution-id <ID> --paths '/branding/*'
```

**These files are not build output.** The deploy `s3 sync --delete` above must keep its
`--exclude "branding/*" --exclude "privacy.html"`, or the next portal deploy deletes them.
The same excludes are applied in `buildspec.yml`.

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
