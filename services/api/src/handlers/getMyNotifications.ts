import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toCenterItem } from '../lib/mappers';

/** GET /me/notifications — the caller's in-app notification center (newest first). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);

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

    const items = (res.Items ?? [])
      .map(toCenterItem)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const unread = items.filter((i) => !i.read).length;
    return ok({ items, unread });
  } catch (e) {
    return fail(e);
  }
};
