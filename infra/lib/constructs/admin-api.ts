import { Construct } from 'constructs';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { IHttpRouteAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';
import { grantCognitoProvisioning, grantPush, grantScheduling } from './grants';

interface AdminApiProps extends NestedStackProps {
  config: EnvConfig;
  table: dynamodb.Table;
  /** The shared HTTP API from the parent stack — admin routes attach to it, not a second API. */
  httpApi: apigw.HttpApi;
  authorizer: IHttpRouteAuthorizer;
  galleryBucket: s3.Bucket;
  assetsBucket: s3.Bucket;
  /** Attendee logins are provisioned into this pool. */
  userPool: cognito.UserPool;
  schedulerRoleArn: string;
  pushEnv: Record<string, string>;
  schedulingEnv: Record<string, string>;
}

/**
 * Nested stack holding every `/admin/*` route (spec §5, §18.x). The route Lambdas + their roles,
 * policies and invoke permissions live here, which keeps the parent stack under CloudFormation's
 * 500-resource limit. Routes/integrations still attach to the parent's shared HttpApi.
 */
export class AdminApi extends NestedStack {
  constructor(scope: Construct, id: string, props: AdminApiProps) {
    super(scope, id, props);
    const { config, table, httpApi, authorizer, galleryBucket, assetsBucket, userPool } = props;
    const galleryEnv = { GALLERY_BUCKET: galleryBucket.bucketName };
    const assetsEnv = { ASSETS_BUCKET: assetsBucket.bucketName };

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

    // Admin — event profile (name, venue, dates, branding; drives the mobile home screen)
    route('AdminUpdateEvent', apigw.HttpMethod.PATCH, '/admin/events/{eventId}', 'adminUpdateEvent.ts', 'write');

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

    // Admin — locations (named places referenced by agenda items)
    route('AdminListLocations', apigw.HttpMethod.GET, '/admin/events/{eventId}/locations', 'adminListLocations.ts', 'read');
    route('AdminCreateLocation', apigw.HttpMethod.POST, '/admin/events/{eventId}/locations', 'adminCreateLocation.ts', 'write');
    route('AdminUpdateLocation', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/locations/{locationId}', 'adminUpdateLocation.ts', 'write');

    // Admin — attendees + CSV import/export
    route('AdminListAttendees', apigw.HttpMethod.GET, '/admin/events/{eventId}/attendees', 'adminListAttendees.ts', 'read');
    route('AdminUpdateAttendee', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/attendees/{attendeeId}', 'adminUpdateAttendee.ts', 'write');

    // Creates Cognito logins for imported attendees. Time-boxed in the handler and given a
    // 29s Lambda timeout (API Gateway hard-stops at 30s), so ~100 attendees take a few clicks.
    const provisionFn = makeHandler(this, 'AdminProvisionAttendees', {
      entry: 'adminProvisionAttendees.ts',
      config,
      table,
      // 'write', not 'read': the handler only queries attendees, but audit() writes an
      // entry at the end. With read-only access the whole run 500s after doing its work.
      access: 'write',
      environment: { USER_POOL_ID: userPool.userPoolId },
      timeoutSeconds: 29,
    });
    grantCognitoProvisioning(provisionFn, userPool.userPoolArn);
    httpApi.addRoutes({
      path: '/admin/events/{eventId}/attendees/provision',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('AdminProvisionAttendeesInt', provisionFn),
      authorizer,
    });
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
    const adminListMapsFn = route('AdminListMaps', apigw.HttpMethod.GET, '/admin/events/{eventId}/maps', 'adminListMaps.ts', 'read', { environment: assetsEnv });
    assetsBucket.grantRead(adminListMapsFn);
    route('AdminCreateMap', apigw.HttpMethod.POST, '/admin/events/{eventId}/maps', 'adminCreateMap.ts', 'write');
    route('AdminUpdateMap', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/maps/{mapId}', 'adminUpdateMap.ts', 'write');
    const mapImageFn = route('AdminRequestMapImageUrl', apigw.HttpMethod.POST, '/admin/events/{eventId}/maps/{mapId}/image-url', 'adminRequestMapImageUrl.ts', 'write', { environment: assetsEnv });
    assetsBucket.grantPut(mapImageFn);

    // Admin — notifications (ad-hoc push composer, spec §18.16)
    route('AdminListNotifications', apigw.HttpMethod.GET, '/admin/events/{eventId}/notifications', 'adminListNotifications.ts', 'read');
    route('AdminCreateNotification', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications', 'adminCreateNotification.ts', 'write');
    route('AdminPreviewAudience', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications/preview', 'adminPreviewAudience.ts', 'read');
    route('AdminGetNotification', apigw.HttpMethod.GET, '/admin/events/{eventId}/notifications/{notificationId}', 'adminGetNotification.ts', 'read');
    const testFn = route('AdminSendTestNotification', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications/{notificationId}/send-test', 'adminSendTestNotification.ts', 'write', { environment: props.pushEnv });
    grantPush(testFn);
    route('AdminDuplicateNotification', apigw.HttpMethod.POST, '/admin/events/{eventId}/notifications/{notificationId}/duplicate', 'adminDuplicateNotification.ts', 'write');

    // Send + cancel need push delivery and EventBridge Scheduler access.
    const sendFn = route(
      'AdminSendNotification',
      apigw.HttpMethod.POST,
      '/admin/events/{eventId}/notifications/{notificationId}/send',
      'adminSendNotification.ts',
      'write',
      { environment: { ...props.pushEnv, ...props.schedulingEnv } }
    );
    grantPush(sendFn);
    grantScheduling(sendFn, props.schedulerRoleArn);

    const cancelFn = route(
      'AdminCancelNotification',
      apigw.HttpMethod.POST,
      '/admin/events/{eventId}/notifications/{notificationId}/cancel',
      'adminCancelNotification.ts',
      'write',
      { environment: props.schedulingEnv }
    );
    grantScheduling(cancelFn, props.schedulerRoleArn);

    // Admin — photo moderation
    const adminListPhotosFn = route('AdminListPhotos', apigw.HttpMethod.GET, '/admin/events/{eventId}/photos', 'adminListPhotos.ts', 'read', { environment: galleryEnv });
    galleryBucket.grantRead(adminListPhotosFn);

    route('AdminModeratePhoto', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/photos/{photoId}', 'adminModeratePhoto.ts', 'write');
  }
}
