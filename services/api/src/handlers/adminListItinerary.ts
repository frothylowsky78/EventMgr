import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toItineraryItem } from '../lib/mappers';

/** GET /admin/events/{eventId}/attendees/{attendeeId}/itinerary — an attendee's itinerary (admin). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const attendeeId = event.pathParameters?.attendeeId;
    if (!attendeeId) throw new ApiException('VALIDATION', 'attendeeId is required');

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
    return ok((res.Items ?? []).map(toItineraryItem));
  } catch (e) {
    return fail(e);
  }
};
