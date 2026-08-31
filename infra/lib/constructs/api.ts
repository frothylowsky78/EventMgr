import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';
import { grantPush } from './grants';
import { AdminApi } from './admin-api';
import { AttendeeApi } from './attendee-api';

interface ApiProps {
  config: EnvConfig;
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  appClient: cognito.UserPoolClient;
  adminClient: cognito.UserPoolClient;
  galleryBucket: s3.Bucket;
  profilePhotosBucket: s3.Bucket;
  assetsBucket: s3.Bucket;
}

/**
 * HTTP API with a Cognito JWT authorizer. Each route maps to its own Lambda with
 * least-privilege table access. See docs/api-contract.md.
 */
export class Api extends Construct {
  readonly httpApi: apigw.HttpApi;
  /** Async (non-API) functions — exposed so Observability can alarm on their errors/DLQs. */
  readonly sendJobFn: NodejsFunction;
  readonly photoProcessFn: NodejsFunction;
  /** DLQ for the EventBridge Scheduler target (failed scheduled sends) — exposed for alarming. */
  readonly schedulerDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    const { config, table, userPool, appClient, adminClient, galleryBucket, profilePhotosBucket, assetsBucket } =
      props;
    const assetsEnv = { ASSETS_BUCKET: assetsBucket.bucketName };
    const galleryEnv = { GALLERY_BUCKET: galleryBucket.bucketName };
    const profileEnv = { PROFILE_BUCKET: profilePhotosBucket.bucketName };

    this.httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: `eventmgr-${config.envName}`,
      corsPreflight: {
        allowOrigins: config.adminPortalOrigins,
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['authorization', 'content-type'],
        maxAge: Duration.hours(1),
      },
    });

    const authorizer = new HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${config.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        identitySource: ['$request.header.Authorization'],
        jwtAudience: [appClient.userPoolClientId, adminClient.userPoolClientId],
      }
    );

    const pushEnv = {
      PUSH_PLATFORM_APP_ARN_IOS: config.pushPlatformAppArnIos ?? '',
      PUSH_PLATFORM_APP_ARN_ANDROID: config.pushPlatformAppArnAndroid ?? '',
    };

    // --- Scheduled-send job (invoked by EventBridge Scheduler, not on the public API) ---
    // No Lambda async DLQ here: the Scheduler invokes this function synchronously, so failures
    // are captured by the Scheduler-target DLQ (this.schedulerDlq) below, not an async DLQ.
    const sendJobFn = makeHandler(this, 'NotificationSendJobFn', {
      entry: 'notificationSendJob.ts',
      config,
      table,
      access: 'write',
      environment: pushEnv,
    });
    grantPush(sendJobFn);
    this.sendJobFn = sendJobFn;

    // Role assumed by EventBridge Scheduler to invoke the send-job Lambda at sendAt.
    const schedulerRole = new iam.Role(this, 'SchedulerInvokeRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });
    sendJobFn.grantInvoke(schedulerRole);

    // DLQ for the schedule target: Scheduler invokes Lambda synchronously, so a persistent
    // failure (after retries) lands here rather than in the Lambda's async DLQ.
    this.schedulerDlq = new sqs.Queue(this, 'SchedulerDlq', {
      queueName: `eventmgr-scheduler-dlq-${config.envName}`,
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
    });
    this.schedulerDlq.grantSendMessages(schedulerRole);

    const schedulingEnv = {
      SEND_JOB_FUNCTION_ARN: sendJobFn.functionArn,
      SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
      SCHEDULER_DLQ_ARN: this.schedulerDlq.queueArn,
    };

    const route = (
      routeId: string,
      method: apigw.HttpMethod,
      routePath: string,
      entry: string,
      access: 'read' | 'write',
      opts: { secured?: boolean; environment?: Record<string, string> } = {}
    ): NodejsFunction => {
      const fn = makeHandler(this, routeId, {
        entry,
        config,
        table,
        access,
        environment: opts.environment,
      });
      this.httpApi.addRoutes({
        path: routePath,
        methods: [method],
        integration: new HttpLambdaIntegration(`${routeId}Int`, fn),
        authorizer: opts.secured === false ? undefined : authorizer,
      });
      return fn;
    };

    // Public
    route('Health', apigw.HttpMethod.GET, '/health', 'health.ts', 'read', { secured: false });

    // S3 ObjectCreated -> finalize photo metadata (thumbnail/moderation hook).
    const photoProcessFn = makeHandler(this, 'PhotoProcessFn', {
      entry: 'photoProcess.ts',
      config,
      table,
      access: 'write',
      environment: galleryEnv,
      deadLetterQueueEnabled: true,
    });
    galleryBucket.grantRead(photoProcessFn);
    galleryBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(photoProcessFn)
    );
    this.photoProcessFn = photoProcessFn;

    // Both route groups live in nested stacks, keeping the parent under CloudFormation's
    // 500-resource limit. Their routes still attach to the shared HttpApi above, so the API
    // URL is unchanged and the parent keeps everything stateful.
    new AttendeeApi(this, 'AttendeeApi', {
      config,
      table,
      httpApi: this.httpApi,
      authorizer,
      galleryBucket,
      profilePhotosBucket,
      assetsBucket,
    });

    new AdminApi(this, 'AdminApi', {
      config,
      table,
      httpApi: this.httpApi,
      authorizer,
      galleryBucket,
      assetsBucket,
      userPool,
      schedulerRoleArn: schedulerRole.roleArn,
      pushEnv,
      schedulingEnv,
    });
  }
}
