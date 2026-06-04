# Backup, retention & post-event archive (spec §18.11)

## What protects the data

| Layer | Mechanism | Where |
| --- | --- | --- |
| DynamoDB — continuous | **Point-in-time recovery** (restore to any second in last 35 days) | `DataStore` (on for staging/prod) |
| DynamoDB — scheduled | **AWS Backup** daily recovery points, retained per env (dev off / staging 14d / prod 35d) | `Backups` construct |
| DynamoDB — accidental delete | **Deletion protection** + `RETAIN` removal policy | prod |
| S3 media | **Versioning** (recover overwritten/deleted objects) | `Media` (staging/prod) |
| S3 imports/exports | 30-day lifecycle expiry | `Media` |

Per-env values live in `infra/lib/config.ts` (`pointInTimeRecovery`, `enableBackups`,
`backupRetentionDays`, `s3Versioned`).

## Restore procedures

**DynamoDB — point in time (PITR):**
```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name EventApp-prod \
  --target-table-name EventApp-prod-restore \
  --restore-date-time <ISO8601>
# Validate the restored table, then swap by updating TABLE_NAME (or migrate items back).
```

**DynamoDB — from an AWS Backup recovery point:**
```bash
aws backup list-recovery-points-by-backup-vault --backup-vault-name eventmgr-prod
aws backup start-restore-job --recovery-point-arn <arn> --iam-role-arn <restore-role> \
  --metadata '{"TargetTableName":"EventApp-prod-restore"}'
```

**S3 object (versioned):** list versions and copy the prior version back:
```bash
aws s3api list-object-versions --bucket event-app-gallery-prod --prefix events/...
aws s3api copy-object --bucket event-app-gallery-prod --key <key> \
  --copy-source event-app-gallery-prod/<key>?versionId=<vid>
```

## Post-event export (admin)
The admin portal **Import/Export** tab + API produce CSVs without AWS access:
- Attendees: `GET /admin/events/{id}/attendees/export`
- Feedback: `GET /admin/events/{id}/feedback/export?targetId=…`
- Photo archive: bulk-download the `event-app-gallery-{env}` prefix (`aws s3 sync`), or add a
  zip-export job (roadmap).
- Notification history, help requests, itineraries: available via their admin list endpoints
  (CSV export endpoints are a small add when needed).

## Retention policy — **decision required** (`docs/open-questions.md` #5)
Defaults proposed below; confirm with the client and codify before launch:
| Data | Proposed retention |
| --- | --- |
| Attendee personal + travel data | Deleted 90 days post-event unless renewed |
| Photos | Available to attendees 90 days post-event, then archived to cold storage / deleted |
| Feedback & help requests | Retained 1 year (anonymized aggregate kept) |
| Full event archive | Exported to client, then AWS data deleted on sign-off |

Implementation hooks for the retention job (roadmap): an EventBridge schedule that runs N days
after `event.endDate` to export-then-purge per the confirmed policy.

## Monitoring (see `docs/architecture.md` §3.7 and the `Observability` construct)
CloudWatch alarms publish to the `eventmgr-alarms-{env}` SNS topic (subscribe ops via
`--context alarmEmail=`): API 5xx, API p95 latency, async-Lambda errors, and **DLQ depth** —
the `photoProcess` async DLQ (failed photo processing) and the **EventBridge Scheduler target
DLQ** `eventmgr-scheduler-dlq-{env}` (a scheduled send that failed after retries). The schedule
target uses a retry policy (3 attempts / 1h max age) before dead-lettering, so scheduled
notifications are never silently dropped. A `EventMgr-{env}` dashboard charts
API traffic/latency and async error rates. X-Ray tracing is enabled on all functions.
