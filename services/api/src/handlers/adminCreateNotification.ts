import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toNotification } from '../lib/mappers';
import { notificationCreateSchema, parseBody } from '../lib/validation';
import { resolveAudience } from '../lib/audience';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/notifications — create a notification.
 * Created as `draft` (or `scheduled` when sendMode=scheduled). Sending is a separate explicit
 * step (`/send`) so the admin can preview and test first (spec §18.16).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(notificationCreateSchema, event.body);
    const id = newId('notif');
    const now = new Date().toISOString();
    const sendMode = input.sendMode ?? 'now';

    // Estimate recipients up front so history/preview show a count immediately.
    const { attendees } = await resolveAudience(eventId, input.target);

    const item = {
      ...keys.notification(eventId, id),
      GSI1PK: keys.notificationList(eventId).GSI1PK,
      GSI1SK: now,
      entity: 'Notification',
      id,
      eventId,
      title: input.title,
      body: input.body,
      target: input.target,
      deepLink: input.deepLink ?? null,
      priority: input.priority ?? 'normal',
      status: sendMode === 'scheduled' ? 'draft' : 'draft',
      sendMode,
      sendAt: input.sendAt ?? null,
      expiresAt: input.expiresAt ?? null,
      internalNote: input.internalNote ?? '',
      createdByAdminId: auth.userId,
      createdAt: now,
      updatedAt: now,
      recipientCount: attendees.length,
      successCount: 0,
      failureCount: 0,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'notification.create', { notificationId: id });

    return ok(toNotification(item), 201);
  } catch (e) {
    return fail(e);
  }
};
