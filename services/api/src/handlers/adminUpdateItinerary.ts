import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toItineraryItem } from '../lib/mappers';
import { itineraryUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PATCH /admin/events/{eventId}/attendees/{attendeeId}/itinerary/{itemId}
 * Read-modify-write. If startDateTime changes, the SK changes, so the old row is replaced.
 */
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

    const patch = parseBody(itineraryUpdateSchema, event.body);

    // Locate the existing item (SK embeds startDateTime, so find by id).
    const found = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': attendeePk(attendeeId), ':sk': keys.itineraryPrefix },
      })
    );
    const existing = (found.Items ?? []).find((i) => i.id === itemId);
    if (!existing) throw new ApiException('NOT_FOUND', 'Itinerary item not found');

    const merged: Record<string, any> = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    // If the start time changed, the sort key must change: delete old, write new.
    if (patch.startDateTime && patch.startDateTime !== existing.startDateTime) {
      await ddb.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: existing.PK, SK: existing.SK } })
      );
      const keyed = keys.itineraryItem(attendeeId, merged.startDateTime, itemId);
      merged.PK = keyed.PK;
      merged.SK = keyed.SK;
    }

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'itinerary.update', { attendeeId, itemId });
    return ok(toItineraryItem(merged));
  } catch (e) {
    return fail(e);
  }
};
