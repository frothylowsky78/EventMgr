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
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';

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

    // Admin — agenda CRUD (role enforced inside the handler in addition to the authorizer)
    route('AdminListAgenda', apigw.HttpMethod.GET, '/admin/events/{eventId}/agenda', 'adminListAgenda.ts', 'read');
    route('AdminCreateAgenda', apigw.HttpMethod.POST, '/admin/events/{eventId}/agenda', 'adminCreateAgenda.ts', 'write');
    route('AdminUpdateAgenda', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/agenda/{agendaId}', 'adminUpdateAgenda.ts', 'write');

    // Admin — dining, travel, transportation management
    route('AdminListDining', apigw.HttpMethod.GET, '/admin/events/{eventId}/dining', 'adminListDining.ts', 'read');
    route('AdminCreateDining', apigw.HttpMethod.POST, '/admin/events/{eventId}/dining', 'adminCreateDining.ts', 'write');
    route('AdminUpdateDining', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/dining/{diningId}', 'adminUpdateDining.ts', 'write');
    route('AdminAssignDiningSeat', apigw.HttpMethod.POST, '/admin/events/{eventId}/dining/{diningId}/seats', 'adminAssignDiningSeat.ts', 'write');
    route('AdminUpsertTravel', apigw.HttpMethod.PUT, '/admin/events/{eventId}/attendees/{attendeeId}/travel', 'adminUpsertTravel.ts', 'write');
    route('AdminCreateTransportation', apigw.HttpMethod.POST, '/admin/events/{eventId}/transportation', 'adminCreateTransportation.ts', 'write');
    route('AdminUpdateTransportation', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/transportation/{attendeeId}/{transportId}', 'adminUpdateTransportation.ts', 'write');

    // Admin — FAQ + weather management
    route('AdminListFaq', apigw.HttpMethod.GET, '/admin/events/{eventId}/faq', 'adminListFaq.ts', 'read');
    route('AdminCreateFaq', apigw.HttpMethod.POST, '/admin/events/{eventId}/faq', 'adminCreateFaq.ts', 'write');
    route('AdminUpdateFaq', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/faq/{faqId}', 'adminUpdateFaq.ts', 'write');
    route('AdminUpsertWeather', apigw.HttpMethod.PUT, '/admin/events/{eventId}/weather', 'adminUpsertWeather.ts', 'write');

    // Admin — feedback + help desk
    route('AdminListFeedback', apigw.HttpMethod.GET, '/admin/events/{eventId}/feedback', 'adminListFeedback.ts', 'read');
    route('AdminUpsertHelp', apigw.HttpMethod.PUT, '/admin/events/{eventId}/help', 'adminUpsertHelp.ts', 'write');
    route('AdminListHelpRequests', apigw.HttpMethod.GET, '/admin/events/{eventId}/help-requests', 'adminListHelpRequests.ts', 'read');
    route('AdminUpdateHelpRequest', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/help-requests/{attendeeId}/{requestId}', 'adminUpdateHelpRequest.ts', 'write');

    // Admin — attendees + CSV import/export
    route('AdminListAttendees', apigw.HttpMethod.GET, '/admin/events/{eventId}/attendees', 'adminListAttendees.ts', 'read');
    route('AdminImportAttendees', apigw.HttpMethod.POST, '/admin/events/{eventId}/attendees/import', 'adminImportAttendees.ts', 'write');
    route('AdminImportAgenda', apigw.HttpMethod.POST, '/admin/events/{eventId}/agenda/import', 'adminImportAgenda.ts', 'write');
    route('AdminExportAttendees', apigw.HttpMethod.GET, '/admin/events/{eventId}/attendees/export', 'adminExportAttendees.ts', 'read');
    route('AdminExportFeedback', apigw.HttpMethod.GET, '/admin/events/{eventId}/feedback/export', 'adminExportFeedback.ts', 'read');

    // Admin — per-attendee management (itinerary / travel / transportation)
    route('AdminListItinerary', apigw.HttpMethod.GET, '/admin/events/{eventId}/attendees/{attendeeId}/itinerary', 'adminListItinerary.ts', 'read');
    route('AdminCreateItinerary', apigw.HttpMethod.POST, '/admin/events/{eventId}/attendees/{attendeeId}/itinerary', 'adminCreateItinerary.ts', 'write');
    route('AdminUpdateItinerary', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/attendees/{attendeeId}/itinerary/{itemId}', 'adminUpdateItinerary.ts', 'write');
    route('AdminDeleteItinerary', apigw.HttpMethod.DELETE, '/admin/events/{eventId}/attendees/{attendeeId}/itinerary/{itemId}', 'adminDeleteItinerary.ts', 'write');
    route('AdminGetTravel', apigw.HttpMethod.GET, '/admin/events/{eventId}/attendees/{attendeeId}/travel', 'adminGetTravel.ts', 'read');
    route('AdminListTransportation', apigw.HttpMethod.GET, '/admin/events/{eventId}/attendees/{attendeeId}/transportation', 'adminListTransportation.ts', 'read');

    // Admin — maps
    route('AdminListMaps', apigw.HttpMethod.GET, '/admin/events/{eventId}/maps', 'adminListMaps.ts', 'read');
    route('AdminCreateMap', apigw.HttpMethod.POST, '/admin/events/{eventId}/maps', 'adminCreateMap.ts', 'write');
    route('AdminUpdateMap', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/maps/{mapId}', 'adminUpdateMap.ts', 'write');

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

    // --- Photos & gallery (pre-signed S3 upload + moderation, spec §4.14/§18.5) ---
    const uploadUrlFn = route('RequestPhotoUploadUrl', apigw.HttpMethod.POST, '/events/{eventId}/photos/upload-url', 'requestPhotoUploadUrl.ts', 'write', { environment: galleryEnv });
    galleryBucket.grantPut(uploadUrlFn);

    const listPhotosFn = route('ListPhotos', apigw.HttpMethod.GET, '/events/{eventId}/photos', 'listPhotos.ts', 'read', { environment: galleryEnv });
    galleryBucket.grantRead(listPhotosFn);

    route('LikePhoto', apigw.HttpMethod.POST, '/events/{eventId}/photos/{photoId}/like', 'likePhoto.ts', 'write');

    const deletePhotoFn = route('DeletePhoto', apigw.HttpMethod.DELETE, '/events/{eventId}/photos/{photoId}', 'deletePhoto.ts', 'write', { environment: galleryEnv });
    galleryBucket.grantDelete(deletePhotoFn);

    const adminListPhotosFn = route('AdminListPhotos', apigw.HttpMethod.GET, '/admin/events/{eventId}/photos', 'adminListPhotos.ts', 'read', { environment: galleryEnv });
    galleryBucket.grantRead(adminListPhotosFn);

    route('AdminModeratePhoto', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/photos/{photoId}', 'adminModeratePhoto.ts', 'write');

    // S3 ObjectCreated -> finalize photo metadata (thumbnail/moderation hook).
    const photoProcessFn = makeHandler(this, 'PhotoProcessFn', {
      entry: 'photoProcess.ts',
      config,
      table,
      access: 'write',
      environment: galleryEnv,
    });
    galleryBucket.grantRead(photoProcessFn);
    galleryBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(photoProcessFn)
    );
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
