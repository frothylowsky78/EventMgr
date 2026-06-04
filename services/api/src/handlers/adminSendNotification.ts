import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toNotification } from '../lib/mappers';
import { deliverNotification } from '../lib/notificationSender';
import { scheduleSend, schedulerConfigured } from '../lib/scheduler';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/notifications/{notificationId}/send
 * - sendMode=now: delivers immediately (in-app receipts + native push).
 * - sendMode=scheduled: registers an EventBridge schedule for sendAt; status -> scheduled.
 * Urgent/all-attendee confirmation is enforced in the admin UI; the API trusts the admin role.
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
      throw new ApiException('CONFLICT', 'Notification already sent');
    }
    if (record.status === 'cancelled') {
      throw new ApiException('CONFLICT', 'Notification was cancelled');
    }

    if (record.sendMode === 'scheduled' && record.sendAt) {
      const when = new Date(record.sendAt).getTime();
      if (when > Date.now()) {
        if (!schedulerConfigured()) {
          throw new ApiException(
            'INTERNAL',
            'Scheduling is not configured in this environment yet'
          );
        }
        await scheduleSend(eventId, notificationId, record.sendAt);
        await ddb.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: keys.notification(eventId, notificationId),
            UpdateExpression: 'SET #s = :scheduled, updatedAt = :now',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
              ':scheduled': 'scheduled',
              ':now': new Date().toISOString(),
            },
          })
        );
        await audit(eventId, auth.userId, 'notification.schedule', {
          notificationId,
          sendAt: record.sendAt,
        });
        return ok({ ...record, status: 'scheduled' });
      }
    }

    const result = await deliverNotification(eventId, notificationId);
    await audit(eventId, auth.userId, 'notification.send', {
      notificationId,
      recipientCount: result.recipientCount,
    });
    return ok(result);
  } catch (e) {
    return fail(e);
  }
};
