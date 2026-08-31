import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';

/**
 * DELETE /me/itinerary/{itemId} — remove something the caller added themselves.
 * Scoped to the caller's own partition, so another attendee's item is simply not found.
 * Admin-assigned items are refused: an attendee can't drop a session staff put on their schedule.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const itemId = event.pathParameters?.itemId;
    if (!itemId) throw new ApiException('VALIDATION', 'itemId is required');

    const found = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': attendeePk(attendeeId), ':sk': keys.itineraryPrefix },
      })
    );
    const existing = (found.Items ?? []).find((i) => i.id === itemId);
    if (!existing) throw new ApiException('NOT_FOUND', 'Itinerary item not found');
    if (existing.source !== 'attendee') {
      throw new ApiException('FORBIDDEN', 'This item was scheduled for you and cannot be removed');
    }

    await ddb.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: existing.PK, SK: existing.SK } })
    );
    return ok({ itemId, deleted: true });
  } catch (e) {
    return fail(e);
  }
};
