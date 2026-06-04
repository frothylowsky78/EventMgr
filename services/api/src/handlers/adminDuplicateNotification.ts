import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toNotification } from '../lib/mappers';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/notifications/{notificationId}/duplicate
 * Clones an existing notification into a fresh draft (resets status/counts/sendAt).
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
    const src = toNotification(got.Item);

    const id = newId('notif');
    const now = new Date().toISOString();
    const item = {
      ...keys.notification(eventId, id),
      GSI1PK: keys.notificationList(eventId).GSI1PK,
      GSI1SK: now,
      entity: 'Notification',
      id,
      eventId,
      title: src.title,
      body: src.body,
      target: src.target,
      deepLink: src.deepLink ?? null,
      priority: src.priority,
      status: 'draft',
      sendMode: 'now',
      sendAt: null,
      expiresAt: src.expiresAt ?? null,
      internalNote: src.internalNote ?? '',
      createdByAdminId: auth.userId,
      createdAt: now,
      updatedAt: now,
      recipientCount: src.recipientCount,
      successCount: 0,
      failureCount: 0,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'notification.duplicate', {
      sourceId: notificationId,
      notificationId: id,
    });
    return ok(toNotification(item), 201);
  } catch (e) {
    return fail(e);
  }
};
