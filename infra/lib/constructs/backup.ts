import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EnvConfig } from '../config';

interface BackupProps {
  config: EnvConfig;
  table: dynamodb.Table;
}

/**
 * Scheduled AWS Backup of the DynamoDB table (spec §18.11). Complements DynamoDB PITR
 * (continuous, 35-day) with point-in-time daily recovery points retained per env. Created only
 * when config.enableBackups is set (staging/prod).
 */
export class Backups extends Construct {
  constructor(scope: Construct, id: string, props: BackupProps) {
    super(scope, id);
    const { config, table } = props;
    if (!config.enableBackups) return;

    const vault = new backup.BackupVault(this, 'Vault', {
      backupVaultName: `eventmgr-${config.envName}`,
      removalPolicy: config.removalPolicy,
    });

    const plan = new backup.BackupPlan(this, 'Plan', {
      backupPlanName: `eventmgr-${config.envName}`,
      backupVault: vault,
    });

    // Daily backup at 07:00 UTC, retained for the configured window.
    plan.addRule(
      new backup.BackupPlanRule({
        ruleName: 'DailyDynamoDb',
        scheduleExpression: events.Schedule.cron({ hour: '7', minute: '0' }),
        deleteAfter: Duration.days(config.backupRetentionDays),
        startWindow: Duration.hours(1),
        completionWindow: Duration.hours(2),
      })
    );

    plan.addSelection('TableSelection', {
      resources: [backup.BackupResource.fromDynamoDbTable(table)],
    });
  }
}
