import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { NotificationRecord } from '@eventmgr/shared-types';
import { ddb } from './dynamo';
import { TABLE_NAME, attendeePk, keys } from './keys';
import { resolveAudience, type ResolvedAttendee } from './audience';
import { sendPush } from './push';
import { toNotification } from './mappers';
import { ApiException } from './http';

interface SendResult {
  recipientCount: number;
  successCount: number;
  failureCount: number;
}

async function deviceTokensFor(attendeeId: string) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': attendeePk(attendeeId),
        ':sk': keys.devicePrefix,
      },
    })
  );
  return (res.Items ?? []).filter((t) => t.enabled !== false);
}

async function writeReceipt(attendee: ResolvedAttendee, n: NotificationRecord): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.notificationReceipt(attendee.id, n.id),
        entity: 'NotificationReceipt',
        notificationId: n.id,
        attendeeId: attendee.id,
        eventId: n.eventId,
        title: n.title,
        body: n.body,
        deepLink: n.deepLink ?? null,
        priority: n.priority,
        read: false,
        createdAt: n.sendAt ?? new Date().toISOString(),
      },
    })
  );
}

/**
 * Core delivery used by both the immediate "send" API and the scheduled job.
 * Always writes the in-app notification-center receipt; additionally delivers a native push
 * to each registered device (no-op when APNs/FCM aren't configured yet). Idempotency: a
 * notification already in a terminal state is not re-sent.
 */
export async function deliverNotification(
  eventId: string,
  notificationId: string
): Promise<NotificationRecord> {
  const got = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.notification(eventId, notificationId) })
  );
  if (!got.Item) throw new ApiException('NOT_FOUND', 'Notification not found');
  const record = toNotification(got.Item);

  if (record.status === 'sent' || record.status === 'cancelled') {
    return record; // already terminal — do not re-send
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.notification(eventId, notificationId),
      UpdateExpression: 'SET #s = :sending, updatedAt = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':sending': 'sending', ':now': new Date().toISOString() },
    })
  );

  const { attendees } = await resolveAudience(eventId, record.target);
  const result: SendResult = {
    recipientCount: attendees.length,
    successCount: 0,
    failureCount: 0,
  };

  for (const attendee of attendees) {
    await writeReceipt(attendee, record); // in-app center always delivered
    const tokens = await deviceTokensFor(attendee.id);
    for (const t of tokens) {
      const ok = await sendPush(t.platform, t.deviceToken, {
        title: record.title,
        body: record.body,
        priority: record.priority,
        deepLink: record.deepLink,
        notificationId: record.id,
      });
      if (ok) result.successCount += 1;
      else result.failureCount += 1;
    }
  }

  const finalStatus = 'sent';
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.notification(eventId, notificationId),
      UpdateExpression:
        'SET #s = :st, recipientCount = :rc, successCount = :sc, failureCount = :fc, sentAt = :now, updatedAt = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':st': finalStatus,
        ':rc': result.recipientCount,
        ':sc': result.successCount,
        ':fc': result.failureCount,
        ':now': new Date().toISOString(),
      },
    })
  );

  return { ...record, status: finalStatus, ...result };
}
