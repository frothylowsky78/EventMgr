import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toItineraryItem } from '../lib/mappers';
import { itineraryCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/attendees/{attendeeId}/itinerary — assign an itinerary item.
 * The SK embeds startDateTime so items stay chronologically ordered for the attendee.
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

    const input = parseBody(itineraryCreateSchema, event.body);
    const id = newId('itin');
    const now = new Date().toISOString();

    const item = {
      ...keys.itineraryItem(attendeeId, input.startDateTime, id),
      entity: 'ItineraryItem',
      id,
      attendeeId,
      eventId,
      agendaItemId: input.agendaItemId ?? null,
      customTitle: input.customTitle ?? null,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      locationId: input.locationId ?? null,
      notes: input.notes ?? '',
      transportationNote: input.transportationNote ?? '',
      reminderEnabled: input.reminderEnabled ?? true,
      visibility: input.visibility ?? 'private',
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'itinerary.create', { attendeeId, itemId: id });
    return ok(toItineraryItem(item), 201);
  } catch (e) {
    return fail(e);
  }
};
