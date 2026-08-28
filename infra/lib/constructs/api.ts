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

interface ApiProps {
  config: EnvConfig;
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  appClient: cognito.UserPoolClient;
  adminClient: cognito.UserPoolClient;
  galleryBucket: s3.Bucket;
  profilePhotosBucket: s3.Bucket;
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
    const { config, table, userPool, appClient, adminClient, galleryBucket, profilePhotosBucket } =
      props;
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

    // Attendee — self
    route('GetMe', apigw.HttpMethod.GET, '/me', 'getMe.ts', 'read');
    route('GetMyItinerary', apigw.HttpMethod.GET, '/me/itinerary', 'getMyItinerary.ts', 'read');

    // Event content
    route('GetEvent', apigw.HttpMethod.GET, '/events/{eventId}', 'getEvent.ts', 'read');
    route('ListAgenda', apigw.HttpMethod.GET, '/events/{eventId}/agenda', 'listAgenda.ts', 'read');
    route('ListDining', apigw.HttpMethod.GET, '/events/{eventId}/dining', 'listDining.ts', 'read');

    // Attendee — personalized travel / transportation / dining (own data only)
    route('GetMyTravel', apigw.HttpMethod.GET, '/me/travel', 'getMyTravel.ts', 'read');
    route('GetMyTransportation', apigw.HttpMethod.GET, '/me/transportation', 'getMyTransportation.ts', 'read');
    route('GetMyDining', apigw.HttpMethod.GET, '/me/dining', 'getMyDining.ts', 'read');
    route('GetItineraryIcs', apigw.HttpMethod.GET, '/me/itinerary.ics', 'getItineraryIcs.ts', 'read');

    // Profile self-service (edit + photo upload)
    route('UpdateProfile', apigw.HttpMethod.PATCH, '/me/profile', 'updateProfile.ts', 'write');
    const profilePhotoFn = route('RequestProfilePhotoUrl', apigw.HttpMethod.POST, '/me/profile-photo/upload-url', 'requestProfilePhotoUrl.ts', 'write', { environment: profileEnv });
    profilePhotosBucket.grantPut(profilePhotoFn);

    // Content modules — FAQ, yearbook directory, weather, maps
    route('ListMaps', apigw.HttpMethod.GET, '/events/{eventId}/maps', 'listMaps.ts', 'read');
    route('ListFaq', apigw.HttpMethod.GET, '/events/{eventId}/faq', 'listFaq.ts', 'read');
    route('ListAttendees', apigw.HttpMethod.GET, '/events/{eventId}/attendees', 'listAttendees.ts', 'read');
    route('GetWeather', apigw.HttpMethod.GET, '/events/{eventId}/weather', 'getWeather.ts', 'read');
    route('GetHelp', apigw.HttpMethod.GET, '/events/{eventId}/help', 'getHelp.ts', 'read');

    // Feedback + help requests (attendee)
    route('SubmitFeedback', apigw.HttpMethod.POST, '/events/{eventId}/feedback', 'submitFeedback.ts', 'write');
    route('GetMyFeedback', apigw.HttpMethod.GET, '/me/feedback-submissions', 'getMyFeedback.ts', 'read');
    route('SubmitHelpRequest', apigw.HttpMethod.POST, '/events/{eventId}/help-requests', 'submitHelpRequest.ts', 'write');
    route('GetMyHelpRequests', apigw.HttpMethod.GET, '/me/help-requests', 'getMyHelpRequests.ts', 'read');

    // Attendee — device tokens + in-app notification center
    route('RegisterDeviceToken', apigw.HttpMethod.POST, '/me/device-tokens', 'registerDeviceToken.ts', 'write');
    route('DeleteDeviceToken', apigw.HttpMethod.DELETE, '/me/device-tokens/{id}', 'deleteDeviceToken.ts', 'write');
    route('GetMyNotifications', apigw.HttpMethod.GET, '/me/notifications', 'getMyNotifications.ts', 'read');
    route('MarkNotificationRead', apigw.HttpMethod.PATCH, '/me/notifications/{id}/read', 'markNotificationRead.ts', 'write');
    route('MarkAllNotificationsRead', apigw.HttpMethod.PATCH, '/me/notifications/read-all', 'markNotificationRead.ts', 'write');

    // --- Photos & gallery (pre-signed S3 upload + moderation, spec §4.14/§18.5) ---
    const uploadUrlFn = route('RequestPhotoUploadUrl', apigw.HttpMethod.POST, '/events/{eventId}/photos/upload-url', 'requestPhotoUploadUrl.ts', 'write', { environment: galleryEnv });
    galleryBucket.grantPut(uploadUrlFn);

    const listPhotosFn = route('ListPhotos', apigw.HttpMethod.GET, '/events/{eventId}/photos', 'listPhotos.ts', 'read', { environment: galleryEnv });
    galleryBucket.grantRead(listPhotosFn);

    route('LikePhoto', apigw.HttpMethod.POST, '/events/{eventId}/photos/{photoId}/like', 'likePhoto.ts', 'write');

    const deletePhotoFn = route('DeletePhoto', apigw.HttpMethod.DELETE, '/events/{eventId}/photos/{photoId}', 'deletePhoto.ts', 'write', { environment: galleryEnv });
    galleryBucket.grantDelete(deletePhotoFn);

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

    // All /admin/* routes live in a nested stack, keeping the parent stack under
    // CloudFormation's 500-resource limit. Routes still attach to the shared HttpApi above.
    new AdminApi(this, 'AdminApi', {
      config,
      table,
      httpApi: this.httpApi,
      authorizer,
      galleryBucket,
      schedulerRoleArn: schedulerRole.roleArn,
      pushEnv,
      schedulingEnv,
    });
  }
}
