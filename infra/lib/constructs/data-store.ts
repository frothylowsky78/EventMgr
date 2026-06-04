import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EnvConfig } from '../config';

/**
 * Single-table DynamoDB store (see docs/data-model.md) with GSI1 and GSI2.
 * On-demand billing; PITR + deletion protection on prod.
 */
export class DataStore extends Construct {
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, config: EnvConfig) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `EventApp-${config.envName}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: config.pointInTimeRecovery,
      deletionProtection: config.envName === 'prod',
      removalPolicy: config.removalPolicy,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
