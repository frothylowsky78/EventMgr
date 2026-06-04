import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toItineraryItem } from '../lib/mappers';

/**
 * GET /me/itinerary — the caller's own itinerary items only.
 * attendeeId comes from the verified JWT claim, never from the request, so one attendee
 * can never read another's itinerary.
 */
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
          ':sk': keys.itineraryPrefix,
        },
      })
    );

    // SK begins with ITINERARY#{startDateTime}#... so results are already chronological.
    const items = (res.Items ?? []).map(toItineraryItem);
    return ok(items);
  } catch (e) {
    return fail(e);
  }
};
