import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toTravelDetail } from '../lib/mappers';
import { travelUpsertSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';
import { autoCompleteAction } from '../lib/registration';

/**
 * PUT /admin/events/{eventId}/attendees/{attendeeId}/travel — set/replace an attendee's travel.
 * Travel is private; only the owner (/me/travel) and admins can read it.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const attendeeId = event.pathParameters?.attendeeId;
    if (!eventId || !attendeeId) {
      throw new ApiException('VALIDATION', 'eventId and attendeeId are required');
    }

    const input = parseBody(travelUpsertSchema, event.body);
    const item = {
      ...keys.travel(attendeeId),
      entity: 'TravelDetail',
      attendeeId,
      eventId,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'travel.upsert', { attendeeId });
    // Travel on file settles the "share your flights" action. This is the only handler that
    // writes travel — there is no attendee-facing save — so it is the only place to hook.
    await autoCompleteAction(attendeeId, 'flight');
    return ok(toTravelDetail(item));
  } catch (e) {
    return fail(e);
  }
};
