import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toNotification } from '../lib/mappers';
import { sendPush } from '../lib/push';

/**
 * POST /admin/events/{eventId}/notifications/{notificationId}/send-test
 * Delivers the notification only to the requesting admin's own attendee profile/devices,
 * so they can verify copy + deep link before a broad send. Does not change the record status
 * or counts. Body: { attendeeId?: string } to target a specific test attendee.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const notificationId = event.pathParameters?.notificationId;
    if (!eventId || !notificationId) {
      throw new ApiException('VALIDATION', 'eventId and notificationId are required');
    }

    const body = event.body ? (JSON.parse(event.body) as { attendeeId?: string }) : {};
    const targetAttendee = body.attendeeId ?? auth.attendeeId;
    if (!targetAttendee) {
      throw new ApiException(
        'VALIDATION',
        'No test recipient: pass attendeeId or use an admin that is also an attendee'
      );
    }

    const got = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.notification(eventId, notificationId) })
    );
    if (!got.Item) throw new ApiException('NOT_FOUND', 'Notification not found');
    const record = toNotification(got.Item);

    // Write an in-app receipt for the tester.
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...keys.notificationReceipt(targetAttendee, `${notificationId}-test`),
          entity: 'NotificationReceipt',
          notificationId,
          attendeeId: targetAttendee,
          eventId,
          title: `[TEST] ${record.title}`,
          body: record.body,
          deepLink: record.deepLink ?? null,
          priority: record.priority,
          read: false,
          createdAt: new Date().toISOString(),
        },
      })
    );

    // Native push to the tester's devices (no-op if APNs/FCM not configured).
    const tokens = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': attendeePk(targetAttendee),
          ':sk': keys.devicePrefix,
        },
      })
    );
    let delivered = 0;
    for (const t of tokens.Items ?? []) {
      const okPush = await sendPush(t.platform, t.deviceToken, {
        title: `[TEST] ${record.title}`,
        body: record.body,
        priority: record.priority,
        deepLink: record.deepLink,
        notificationId,
      });
      if (okPush) delivered += 1;
    }

    return ok({ test: true, recipient: targetAttendee, pushDelivered: delivered });
  } catch (e) {
    return fail(e);
  }
};
