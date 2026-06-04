# CI/CD — AWS CodePipeline (and why there's no Dockerfile)

EventMgr is **serverless**. It deploys with **AWS CDK** (backend → Lambda/API Gateway/DynamoDB/S3)
and a **static build** for the admin SPA (→ S3 + CloudFront). There is **no container**, so a
`Dockerfile` is neither present nor needed.

If CodePipeline/CodeBuild reports *"Dockerfile is missing"*, the build was configured to build a
**container image**. Fix it by pointing the build at [`buildspec.yml`](../buildspec.yml) instead.

## Pipeline shape
```
Source (GitHub via CodeStar connection)  ->  Build (CodeBuild, buildspec.yml)
```
A separate "Deploy" stage is **not** required — `buildspec.yml` runs `cdk deploy` itself. (You can
add manual-approval stages between dev → staging → prod if you prefer gated promotion.)

## CodeBuild project settings
- **Environment image:** `aws/codebuild/amazonlinux2-x86_64-standard:5.0` (or newer managed image).
- **Privileged / Docker:** **OFF** (this is what triggers the Dockerfile lookup — leave it off).
- **Buildspec:** "Use a buildspec file" → `buildspec.yml` (repo root).
- **Environment variables:**
  | Var | Example | Purpose |
  | --- | --- | --- |
  | `ENV` | `dev` | which stack (`EventApp-<ENV>`) to deploy |
  | `EVENT_ID` | `event_001` | admin build event id |
  | `DEPLOY_ADMIN` | `true` | also build + ship the admin SPA (`false` = backend only) |

## CodeBuild service role (IAM)
CDK assumes its bootstrap roles to deploy, so the CodeBuild role needs:
- `sts:AssumeRole` on `arn:aws:iam::<ACCOUNT>:role/cdk-*` (the deploy/publish/lookup roles created
  by `cdk bootstrap`), and
- for the admin step: `s3:PutObject`/`s3:DeleteObject`/`s3:ListBucket` on `event-app-admin-<env>`
  and `cloudfront:CreateInvalidation`.

Run `cdk bootstrap aws://<ACCOUNT>/<REGION>` once before the first pipeline run.

## What the build does (`buildspec.yml`)
1. `npm ci` (Node 20).
2. Build `@eventmgr/shared-types` (required before CDK bundles the Lambdas).
3. `cdk deploy EventApp-$ENV --require-approval never --outputs-file cdk-outputs.json`.
4. If `DEPLOY_ADMIN=true`: read stack outputs, build the admin SPA with the matching `VITE_*`
   values, `s3 sync` to the admin bucket, and invalidate CloudFront.

> **No Docker, even for Lambda bundling.** The CDK `NodejsFunction` Lambdas bundle with **esbuild**,
> which is a committed dev dependency of `infra/` — so `npm ci` installs it and CDK bundles locally.
> Keep the CodeBuild project **Privileged/Docker = OFF**; if esbuild were missing, CDK would fall
> back to Docker bundling and `cdk deploy` would fail with exit 1.

## Multi-environment promotion
Use one pipeline per environment (separate `ENV`), or one pipeline with sequential stages each
running this buildspec with a different `ENV` and a **manual approval** before staging/prod.

## Alternative: GitHub Actions
If you'd rather not use CodePipeline, the same steps run as a GitHub Actions workflow with an
OIDC role: `npm ci` → build shared-types → `cdk deploy` → admin build + `s3 sync` + invalidation.
(The `buildspec.yml` steps map 1:1 to workflow steps.)

## Not the right path for this app
- **App Runner / ECS / Elastic Beanstalk (Docker)** — these run long-lived containers; EventMgr has
  no server process, so don't deploy it there.
- **Amplify Hosting** *can* host the admin SPA (static, uses `amplify.yml`, no Dockerfile) but the
  backend still deploys via CDK — so the buildspec path above keeps everything in one place.
