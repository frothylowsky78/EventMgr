import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toNotification } from '../lib/mappers';
import { cancelScheduledSend } from '../lib/scheduler';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/notifications/{notificationId}/cancel
 * Cancels a draft or scheduled notification (removes the EventBridge schedule if present).
 * A notification that has already been sent cannot be cancelled.
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

    const got = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.notification(eventId, notificationId) })
    );
    if (!got.Item) throw new ApiException('NOT_FOUND', 'Notification not found');
    const record = toNotification(got.Item);
    if (record.status === 'sent') {
      throw new ApiException('CONFLICT', 'Cannot cancel a sent notification');
    }

    await cancelScheduledSend(notificationId);
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.notification(eventId, notificationId),
        UpdateExpression: 'SET #s = :cancelled, updatedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':cancelled': 'cancelled', ':now': new Date().toISOString() },
      })
    );
    await audit(eventId, auth.userId, 'notification.cancel', { notificationId });

    return ok({ ...record, status: 'cancelled' });
  } catch (e) {
    return fail(e);
  }
};
