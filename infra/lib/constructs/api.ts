import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';

interface ApiProps {
  config: EnvConfig;
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  appClient: cognito.UserPoolClient;
  adminClient: cognito.UserPoolClient;
}

/**
 * HTTP API with a Cognito JWT authorizer. Each route maps to its own Lambda with
 * least-privilege table access. See docs/api-contract.md.
 */
export class Api extends Construct {
  readonly httpApi: apigw.HttpApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    const { config, table, userPool, appClient, adminClient } = props;

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
    const sendJobFn = makeHandler(this, 'NotificationSendJobFn', {
      entry: 'notificationSendJob.ts',
      config,
      table,
      access: 'write',
      environment: pushEnv,
    });
    grantPush(sendJobFn);

    // Role assumed by EventBridge Scheduler to invoke the send-job Lambda at sendAt.
    const schedulerRole = new iam.Role(this, 'SchedulerInvokeRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });
    sendJobFn.grantInvoke(schedulerRole);

    const schedulingEnv = {
      SEND_JOB_FUNCTION_ARN: sendJobFn.functionArn,
      SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
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

    // Attendee — self
    route('GetMe', apigw.HttpMethod.GET, '/me', 'getMe.ts', 'read');
    route('GetMyItinerary', apigw.HttpMethod.GET, '/me/itinerary', 'getMyItinerary.ts', 'read');

    // Event content
    route('GetEvent', apigw.HttpMethod.GET, '/events/{eventId}', 'getEvent.ts', 'read');
    route('ListAgenda', apigw.HttpMethod.GET, '/events/{eventId}/agenda', 'listAgenda.ts', 'read');

    // Admin — agenda CRUD (role enforced inside the handler in addition to the authorizer)
    route('AdminListAgenda', apigw.HttpMethod.GET, '/admin/events/{eventId}/agenda', 'adminListAgenda.ts', 'read');
    route('AdminCreateAgenda', apigw.HttpMethod.POST, '/admin/events/{eventId}/agenda', 'adminCreateAgenda.ts', 'write');
    route('AdminUpdateAgenda', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/agenda/{agendaId}', 'adminUpdateAgenda.ts', 'write');

    // Attendee — device tokens + in-app notification center
    route('RegisterDeviceToken', apigw.HttpMethod.POST, '/me/device-tokens', 'registerDeviceToken.ts', 'write');
    route('DeleteDeviceToken', apigw.HttpMethod.DELETE, '/me/device-tokens/{id}', 'deleteDeviceToken.ts', 'write');
    route('GetMyNotifications', apigw.HttpMethod.GET, '/me/notifications', 'getMyNotifications.ts', 'read');
    route('MarkNotificationRead', apigw.HttpMethod.PATCH, '/me/notifications/{id}/read', 'markNotificationRead.ts', 'write');
    route('MarkAllNotificationsRead', apigw.HttpMethod.PATCH, '/me/notifications/read-all', 'markNotificationRead.ts', 'write');

    // Admin — notifications (ad-hoc push composer, spec §18.16)
    route('AdminListNotifications', apigw.HttpMethod.GET, '/admin/events/{eventId}/notifications', 'adminListNotifications.ts', 'read');
    route('AdminCreateNotification', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications', 'adminCreateNotification.ts', 'write');
    route('AdminPreviewAudience', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications/preview', 'adminPreviewAudience.ts', 'read');
    route('AdminGetNotification', apigw.HttpMethod.GET, '/admin/events/{eventId}/notifications/{notificationId}', 'adminGetNotification.ts', 'read');
    const testFn = route('AdminSendTestNotification', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications/{notificationId}/send-test', 'adminSendTestNotification.ts', 'write', { environment: pushEnv });
    grantPush(testFn);
    route('AdminDuplicateNotification', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications/{notificationId}/duplicate', 'adminDuplicateNotification.ts', 'write');

    // Send + cancel need push delivery and EventBridge Scheduler access.
    const sendFn = route(
      'AdminSendNotification',
      apigw.HttpMethod.POST,
      '/admin/events/{eventId}/notifications/{notificationId}/send',
      'adminSendNotification.ts',
      'write',
      { environment: { ...pushEnv, ...schedulingEnv } }
    );
    grantPush(sendFn);
    grantScheduling(sendFn, schedulerRole.roleArn);

    const cancelFn = route(
      'AdminCancelNotification',
      apigw.HttpMethod.POST,
      '/admin/events/{eventId}/notifications/{notificationId}/cancel',
      'adminCancelNotification.ts',
      'write',
      { environment: schedulingEnv }
    );
    grantScheduling(cancelFn, schedulerRole.roleArn);
  }
}

/** SNS permissions for creating platform endpoints + publishing native push. */
function grantPush(fn: NodejsFunction): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['sns:CreatePlatformEndpoint', 'sns:Publish'],
      resources: ['*'], // platform application + endpoint ARNs are dynamic
    })
  );
}

/** EventBridge Scheduler permissions + ability to pass the scheduler role. */
function grantScheduling(fn: NodejsFunction, schedulerRoleArn: string): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['scheduler:CreateSchedule', 'scheduler:DeleteSchedule', 'scheduler:GetSchedule'],
      resources: ['*'],
    })
  );
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [schedulerRoleArn],
    })
  );
}
