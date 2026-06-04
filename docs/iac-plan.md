# Infrastructure-as-code plan (AWS CDK, TypeScript)

All AWS resources are defined in `infra/` and deployed per environment. No console
click-ops — everything is reproducible from source.

## Stack organization

`infra/bin/eventmgr.ts` instantiates one app with one stack per environment, parameterized by
an `EnvConfig` (`infra/lib/config.ts`):

```
EventApp-dev       (account/region from CDK context or env)
EventApp-staging
EventApp-prod
```

Each stack is composed of constructs (`infra/lib/constructs/`) so the same code builds every env
with env-specific removal policies, capacity, and protections:

| Construct | Resources |
| --- | --- |
| `DataStore` | DynamoDB `EventApp-{env}` table (PK/SK + GSI1 + GSI2), PITR & deletion protection on prod |
| `Media` | S3 buckets: assets, profile-photos, gallery, imports, exports (all private; versioned on prod) |
| `Auth` | Cognito user pool + app clients, groups (`attendee`/`event_staff`/`event_admin`/`super_admin`), custom-auth Lambda triggers, PreTokenGeneration |
| `Api` | API Gateway HTTP API, Cognito JWT authorizer, routes → Lambda integrations, CORS, access logs |
| `Functions` | One Lambda per route group (NodejsFunction, esbuild bundling), least-privilege IAM |
| `Messaging` | SNS platform applications (APNs/FCM) / Pinpoint project, EventBridge Scheduler role |
| `Web` | S3 + CloudFront (OAC) for the admin SPA |
| `Observability` | Log groups, metric alarms (5xx, p95 latency, push/photo failures), optional dashboard |

## Environment config (`infra/lib/config.ts`)

```ts
export interface EnvConfig {
  envName: 'dev' | 'staging' | 'prod';
  account?: string;
  region: string;
  removalPolicy: RemovalPolicy;   // DESTROY for dev, RETAIN for staging/prod
  pointInTimeRecovery: boolean;   // true on prod
  s3Versioned: boolean;           // true on prod
  enforceAdminMfa: boolean;       // true on prod
  adminPortalOrigins: string[];   // CORS allowlist
}
```

## Deploy

```bash
cd infra
npm install
npx cdk bootstrap            # once per account/region
npx cdk deploy EventApp-dev --context env=dev
npx cdk deploy EventApp-staging --context env=staging
npx cdk deploy EventApp-prod --context env=prod
```

Stack outputs (API URL, user-pool id, app-client id, table name, bucket names) are exported and
consumed by the mobile/admin build configs.

## Secrets & parameters

- Weather API key, APNs key/cert, FCM server key → **SSM Parameter Store** (SecureString) /
  **Secrets Manager**, referenced by ARN in the stack — never committed.
- Per-env parameter prefix: `/eventmgr/{env}/...`.

## CI/CD (roadmap)

- GitHub Actions: `cdk synth` + unit tests on PR; `cdk deploy` to dev on merge to a dev branch;
  manual approval gate for staging/prod.
- Admin SPA: build with `VITE_ENV`, sync to its S3 bucket, invalidate CloudFront.

## Acceptance criteria coverage

- ✅ Infra recreatable from source control (CDK).
- ✅ Consistent dev/staging/prod via one parameterized stack.
- ✅ Least-privilege IAM (per-Lambda roles scoped to needed table/bucket actions).
- ✅ Prod data protected (PITR, deletion protection, RETAIN, S3 versioning).
