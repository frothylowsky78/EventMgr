import { Construct } from 'constructs';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { IHttpRouteAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';

interface AttendeeApiProps extends NestedStackProps {
  config: EnvConfig;
  table: dynamodb.Table;
  /** The shared HTTP API from the parent stack — these routes attach to it, not a second API. */
  httpApi: apigw.HttpApi;
  authorizer: IHttpRouteAuthorizer;
  galleryBucket: s3.Bucket;
  profilePhotosBucket: s3.Bucket;
  assetsBucket: s3.Bucket;
}

/**
 * Nested stack holding every attendee-facing route — `/me/*` and `/events/{eventId}/*`.
 *
 * Same reasoning as AdminApi: the route Lambdas, their roles, policies, integrations and
 * permissions live here so the parent stays clear of CloudFormation's 500-resource limit. It
 * was at 471 before this split.
 *
 * Everything stateful or identity-bearing stays in the parent on purpose — the HttpApi (moving
 * it changes the API URL), the DynamoDB table, the Cognito pool and clients, the S3 buckets and
 * the CloudFront distribution. So do the auth-trigger Lambdas, and the two async functions the
 * parent wires to an S3 notification and to EventBridge Scheduler.
 */
export class AttendeeApi extends NestedStack {
  constructor(scope: Construct, id: string, props: AttendeeApiProps) {
    super(scope, id, props);
    const { config, table, httpApi, authorizer, galleryBucket, profilePhotosBucket, assetsBucket } =
      props;
    const assetsEnv = { ASSETS_BUCKET: assetsBucket.bucketName };
    const galleryEnv = { GALLERY_BUCKET: galleryBucket.bucketName };
    const profileEnv = { PROFILE_BUCKET: profilePhotosBucket.bucketName };

    const route = (
      routeId: string,
      method: apigw.HttpMethod,
      routePath: string,
      entry: string,
      access: 'read' | 'write',
      opts: { environment?: Record<string, string> } = {}
    ): NodejsFunction => {
      const fn = makeHandler(this, routeId, {
        entry,
        config,
        table,
        access,
        environment: opts.environment,
      });
      httpApi.addRoutes({
        path: routePath,
        methods: [method],
        integration: new HttpLambdaIntegration(`${routeId}Int`, fn),
        authorizer,
      });
      return fn;
    };

    // Attendee — self
    // /me, /me/profile and the yearbook all presign profile-photo keys on read.
    const getMeFn = route('GetMe', apigw.HttpMethod.GET, '/me', 'getMe.ts', 'read', { environment: profileEnv });
    profilePhotosBucket.grantRead(getMeFn);
    route('GetMyItinerary', apigw.HttpMethod.GET, '/me/itinerary', 'getMyItinerary.ts', 'read');

    // Registration checklist (spec §4.3). POST ticks an action, DELETE un-ticks it; one Lambda
    // for both, same reasoning as ManageBlocks below.
    const registrationFn = makeHandler(this, 'CompleteRegistrationAction', {
      entry: 'completeRegistrationAction.ts',
      config,
      table,
      access: 'write',
      environment: profileEnv,
    });
    profilePhotosBucket.grantRead(registrationFn);
    httpApi.addRoutes({
      path: '/me/registration/actions/{actionId}/complete',
      methods: [apigw.HttpMethod.POST, apigw.HttpMethod.DELETE],
      integration: new HttpLambdaIntegration('CompleteRegistrationActionInt', registrationFn),
      authorizer,
    });
    // Attendee self-service adds/removes; the handlers copy times from the agenda item and
    // refuse to delete admin-assigned rows.
    route('CreateMyItinerary', apigw.HttpMethod.POST, '/me/itinerary', 'createMyItinerary.ts', 'write');
    route('DeleteMyItinerary', apigw.HttpMethod.DELETE, '/me/itinerary/{itemId}', 'deleteMyItinerary.ts', 'write');

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
    const updateProfileFn = route('UpdateProfile', apigw.HttpMethod.PATCH, '/me/profile', 'updateProfile.ts', 'write', { environment: profileEnv });
    profilePhotosBucket.grantRead(updateProfileFn);
    const profilePhotoFn = route('RequestProfilePhotoUrl', apigw.HttpMethod.POST, '/me/profile-photo/upload-url', 'requestProfilePhotoUrl.ts', 'write', { environment: profileEnv });
    profilePhotosBucket.grantPut(profilePhotoFn);

    // Content modules — FAQ, yearbook directory, weather, maps
    const listMapsFn = route('ListMaps', apigw.HttpMethod.GET, '/events/{eventId}/maps', 'listMaps.ts', 'read', { environment: assetsEnv });
    assetsBucket.grantRead(listMapsFn);
    route('ListFaq', apigw.HttpMethod.GET, '/events/{eventId}/faq', 'listFaq.ts', 'read');
    // Blocking (App Store guideline 1.2). POST and DELETE share one Lambda: same
    // read-modify-write on the same attribute, and a second function would cost ~6 more
    // resources against the parent stack's 500 limit.
    const blocksFn = makeHandler(this, 'ManageBlocks', {
      entry: 'manageBlock.ts',
      config,
      table,
      access: 'write',
    });
    httpApi.addRoutes({
      path: '/me/blocks/{attendeeId}',
      methods: [apigw.HttpMethod.POST, apigw.HttpMethod.DELETE],
      integration: new HttpLambdaIntegration('ManageBlocksInt', blocksFn),
      authorizer,
    });

    const listAttendeesFn = route('ListAttendees', apigw.HttpMethod.GET, '/events/{eventId}/attendees', 'listAttendees.ts', 'read', { environment: profileEnv });
    profilePhotosBucket.grantRead(listAttendeesFn);
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

    // --- Messaging (CF-6/CF-7). Polled, not sockets: no WebSocket API by design — with push
    // cut, a socket cannot wake a backgrounded app. The admin inbox reuses these same routes;
    // an admin token resolves to the shared per-event staff partition, so staff need none of
    // their own. See services/api/src/lib/messaging.ts.
    route('ListMyConversations', apigw.HttpMethod.GET, '/me/conversations', 'listMyConversations.ts', 'read');
    route('CreateConversation', apigw.HttpMethod.POST, '/me/conversations', 'createConversation.ts', 'write');
    route('ListConversationMessages', apigw.HttpMethod.GET, '/me/conversations/{id}/messages', 'listConversationMessages.ts', 'write');
    route('PostConversationMessage', apigw.HttpMethod.POST, '/me/conversations/{id}/messages', 'postConversationMessage.ts', 'write');
    route('GetUnreadCount', apigw.HttpMethod.GET, '/me/unread-count', 'getUnreadCount.ts', 'read');
    route('ReportMessage', apigw.HttpMethod.POST, '/events/{eventId}/conversations/{conversationId}/messages/{messageId}/report', 'reportMessage.ts', 'write');

    // --- Photos & gallery (pre-signed S3 upload + moderation, spec §4.14/§18.5) ---
    const uploadUrlFn = route('RequestPhotoUploadUrl', apigw.HttpMethod.POST, '/events/{eventId}/photos/upload-url', 'requestPhotoUploadUrl.ts', 'write', { environment: galleryEnv });
    galleryBucket.grantPut(uploadUrlFn);

    const listPhotosFn = route('ListPhotos', apigw.HttpMethod.GET, '/events/{eventId}/photos', 'listPhotos.ts', 'read', { environment: galleryEnv });
    galleryBucket.grantRead(listPhotosFn);

    route('LikePhoto', apigw.HttpMethod.POST, '/events/{eventId}/photos/{photoId}/like', 'likePhoto.ts', 'write');
    route('ReportPhoto', apigw.HttpMethod.POST, '/events/{eventId}/photos/{photoId}/report', 'reportPhoto.ts', 'write');

    const deletePhotoFn = route('DeletePhoto', apigw.HttpMethod.DELETE, '/events/{eventId}/photos/{photoId}', 'deletePhoto.ts', 'write', { environment: galleryEnv });
    galleryBucket.grantDelete(deletePhotoFn);

  }
}
