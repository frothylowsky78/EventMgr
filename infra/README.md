# Infrastructure (AWS CDK, TypeScript)

Defines the full per-environment AWS backend. See [`../docs/iac-plan.md`](../docs/iac-plan.md)
and [`../docs/architecture.md`](../docs/architecture.md).

## Stacks
One parameterized stack per environment: `EventApp-dev`, `EventApp-staging`, `EventApp-prod`.

## Constructs
| File | Resources |
| --- | --- |
| `lib/constructs/data-store.ts` | DynamoDB single table + GSI1 + GSI2 |
| `lib/constructs/media.ts` | S3: assets, profile-photos, gallery, imports, exports (private) |
| `lib/constructs/auth.ts` | Cognito user pool, groups, custom-auth + PreTokenGeneration triggers, app clients |
| `lib/constructs/function-factory.ts` | esbuild-bundled Node 20 Lambdas from `services/api`, least-privilege grants |
| `lib/constructs/api.ts` | HTTP API + Cognito JWT authorizer + routes |
| `lib/constructs/web.ts` | S3 + CloudFront (OAC) admin SPA hosting |
| `lib/event-app-stack.ts` | Composes the above; exports outputs |

## Commands
```bash
npm install
npm run typecheck
npx cdk bootstrap                      # once per account/region
npx cdk synth  --context env=dev
npx cdk deploy --context env=dev       # or staging / prod
```

## Outputs (per stack)
`ApiUrl`, `UserPoolId`, `MobileClientId`, `AdminClientId`, `TableName`, `GalleryBucket`,
`AdminPortalUrl`, `Region` — wired into the mobile (`--dart-define`) and admin (`VITE_*`) builds.

## Notes
- Lambdas bundle the handlers in `services/api/src/handlers`; no separate build step needed.
- Prod gets PITR, deletion protection, S3 versioning, RETAIN removal policy, and admin MFA.
- Secrets (weather/APNs/FCM) live in SSM/Secrets Manager and are referenced by ARN — never in code.
