# Open questions & assumptions

## Resolved (Phase 1 kickoff)
| # | Question | Decision |
| --- | --- | --- |
| 1 | Backend platform | **AWS serverless** (mandated by task) |
| 2 | Attendee auth | **Email + access code** (Cognito custom auth, passwordless for guests) |
| 3 | IaC tool | **AWS CDK (TypeScript)** |
| 4 | Admin portal framework | **React + Vite + TypeScript** (static SPA on S3 + CloudFront) |

## Assumptions made (reasonable defaults — flag if any are wrong)
| # | Area | Assumption |
| --- | --- | --- |
| A1 | Multi-event | Single live event now; schema/keys are multi-event ready. No multi-event admin UX yet. |
| A2 | Photo moderation | Uploads default to `pending` (admin approval required) — spec §4.14/§18.5. |
| A3 | Profile photo edits | Attendees **may** request/upload profile photo; admin can override. Configurable per event. |
| A4 | Calendar sync | Support **both** single-item and full-itinerary ICS export. |
| A5 | Travel data | Imported manually by admin (CSV/XLSX); no live travel-system integration in V1. |
| A6 | Weather | Live API (e.g. OpenWeather) **plus** admin manual notes/alerts override. |
| A7 | Distribution | Public App Store + Google Play release (private/TestFlight also supported). |
| A8 | DynamoDB | Single-table, on-demand billing. |
| A9 | Access code | Per-attendee code stored hashed in DynamoDB; admins can rotate. (Shared event code also supportable.) |
| A10 | Region | Default `us-west-2` (event timezone is `America/Los_Angeles`); override per env. |
| A11 | Push transport | Start with SNS direct (APNs+FCM); Pinpoint optional if campaign analytics needed. |
| A12 | Deployment in this container | Code + IaC delivered and buildable; live AWS provisioning happens where credentials exist. |

## Still open — do not block the foundation, but need answers before full build-out
1. **Access code style:** one shared event code for everyone, or a unique per-attendee code? (We
   implemented per-attendee, which is more secure; confirm preference.)
2. **Admin roles granularity:** are `event_staff` vs `event_admin` vs `super_admin` permission
   boundaries needed for V1, or is a single admin role enough initially?
3. **Photo download by attendees:** allowed, and if so, originals or web-res only?
4. **Attendee directory default visibility:** opt-in or opt-out by default per privacy policy?
5. **Data retention:** how long are attendee/travel/photo data kept post-event, and is the
   archive downloaded then deleted from AWS? (§18.11 needs a concrete policy.)
6. **Weather provider & API key** ownership/billing.
7. **APNs/FCM credentials** — who provides the Apple developer + Firebase project + push certs?
8. **Branding assets** — final logo, hero image, color palette, app icon, splash.
9. **Languages** — English only, or localization needed?
10. **Help requests routing** — email/SMS to staff, Slack, or admin-portal-only inbox?
11. **Feedback anonymity** — is the "anonymous mode" required for V1?
12. **Domain names** for the admin portal + any CloudFront custom domains (for CORS + certs).
