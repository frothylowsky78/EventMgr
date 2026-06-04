import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';

/**
 * Marks notification receipts read for the caller.
 *   PATCH /me/notifications/{id}/read   — one
 *   PATCH /me/notifications/read-all     — all (id omitted)
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const id = event.pathParameters?.id;

    if (id) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: keys.notificationReceipt(attendeeId, id),
          UpdateExpression: 'SET #r = :true',
          ExpressionAttributeNames: { '#r': 'read' },
          ExpressionAttributeValues: { ':true': true },
          ConditionExpression: 'attribute_exists(PK)',
        })
      ).catch(() => {
        throw new ApiException('NOT_FOUND', 'Notification not found');
      });
      return ok({ id, read: true });
    }

    // read-all
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': attendeePk(attendeeId),
          ':sk': keys.receiptPrefix,
        },
      })
    );
    const unread = (res.Items ?? []).filter((i) => i.read !== true);
    for (const item of unread) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET #r = :true',
          ExpressionAttributeNames: { '#r': 'read' },
          ExpressionAttributeValues: { ':true': true },
        })
      );
    }
    return ok({ updated: unread.length });
  } catch (e) {
    return fail(e);
  }
};
