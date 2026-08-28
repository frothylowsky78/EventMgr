import { Construct } from 'constructs';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EnvConfig } from '../config';

const HANDLERS_ROOT = path.join(__dirname, '..', '..', '..', 'services', 'api', 'src', 'handlers');

interface HandlerOptions {
  /** Path under services/api/src/handlers, e.g. "getEvent.ts" or "auth/preTokenGeneration.ts". */
  entry: string;
  config: EnvConfig;
  /** If provided, the function gets least-privilege access and TABLE_NAME wired in. */
  table?: dynamodb.Table;
  /** read = read+query, write = read+write. Defaults to read. */
  access?: 'read' | 'write';
  environment?: Record<string, string>;
  /** Auto-create an SQS dead-letter queue for failed async invocations (S3/EventBridge). */
  deadLetterQueueEnabled?: boolean;
  /** Override the 10s default. Cap at 29s for API routes — API Gateway hard-stops at 30s. */
  timeoutSeconds?: number;
}

/**
 * Creates a bundled (esbuild) Node.js Lambda from a TypeScript handler in services/api.
 * Centralizes runtime, logging, tracing, and least-privilege table grants.
 */
export function makeHandler(scope: Construct, id: string, opts: HandlerOptions): NodejsFunction {
  const { config, table, access = 'read' } = opts;

  const fn = new NodejsFunction(scope, id, {
    entry: path.join(HANDLERS_ROOT, opts.entry),
    handler: 'handler',
    runtime: lambda.Runtime.NODEJS_20_X,
    architecture: lambda.Architecture.ARM_64,
    memorySize: 256,
    timeout: Duration.seconds(opts.timeoutSeconds ?? 10),
    tracing: lambda.Tracing.ACTIVE,
    deadLetterQueueEnabled: opts.deadLetterQueueEnabled,
    bundling: { minify: true, sourceMap: true, target: 'node20' },
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
      ENV_NAME: config.envName,
      ...(table ? { TABLE_NAME: table.tableName } : {}),
      ...(opts.environment ?? {}),
    },
  });

  if (table) {
    if (access === 'write') table.grantReadWriteData(fn);
    else table.grantReadData(fn);
  }

  return fn;
}
