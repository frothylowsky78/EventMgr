import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { audit } from '../lib/audit';

/** DELETE /admin/events/{eventId}/attendees/{attendeeId}/itinerary/{itemId}. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const attendeeId = event.pathParameters?.attendeeId;
    const itemId = event.pathParameters?.itemId;
    if (!eventId || !attendeeId || !itemId) {
      throw new ApiException('VALIDATION', 'eventId, attendeeId and itemId are required');
    }

    const found = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': attendeePk(attendeeId), ':sk': keys.itineraryPrefix },
      })
    );
    const existing = (found.Items ?? []).find((i) => i.id === itemId);
    if (!existing) throw new ApiException('NOT_FOUND', 'Itinerary item not found');

    await ddb.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: existing.PK, SK: existing.SK } })
    );
    await audit(eventId, auth.userId, 'itinerary.delete', { attendeeId, itemId });
    return ok({ itemId, deleted: true });
  } catch (e) {
    return fail(e);
  }
};
