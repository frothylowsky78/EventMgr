import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toItineraryItem } from '../lib/mappers';
import { myItineraryCreateSchema, parseBody } from '../lib/validation';
import { localToIso } from '../lib/localTime';
import { newId } from '../lib/id';
import { resolveEventId } from '../lib/eventId';

/**
 * POST /me/itinerary — the caller adds an agenda session to their own itinerary.
 * Times and location are copied from the agenda item rather than taken from the request, so an
 * attendee can only mirror the published schedule. Idempotent: a second add for the same agenda
 * item returns the existing row (200) instead of creating a duplicate.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const eventId = await resolveEventId(auth);

    const input = parseBody(myItineraryCreateSchema, event.body);

    const [agendaRes, eventRes, existingRes] = await Promise.all([
      ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: keys.agendaItem(eventId, input.agendaItemId),
        })
      ),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: keys.eventProfile(eventId) })),
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': attendeePk(attendeeId),
            ':sk': keys.itineraryPrefix,
          },
        })
      ),
    ]);

    const agenda = agendaRes.Item;
    if (!agenda || agenda.published === false) {
      throw new ApiException('NOT_FOUND', 'Agenda item not found');
    }

    // Idempotent add — the mobile button can be double-tapped, and a retry must not duplicate.
    const already = (existingRes.Items ?? []).find((i) => i.agendaItemId === input.agendaItemId);
    if (already) return ok(toItineraryItem(already));

    const zone = (eventRes.Item?.timezone as string) ?? 'UTC';
    const startDateTime = localToIso(agenda.date as string, agenda.startTime as string, zone);
    const endDateTime = agenda.endTime
      ? localToIso(agenda.date as string, agenda.endTime as string, zone)
      : undefined;

    const id = newId('itin');
    const now = new Date().toISOString();
    const item = {
      ...keys.itineraryItem(attendeeId, startDateTime, id),
      entity: 'ItineraryItem',
      id,
      attendeeId,
      eventId,
      agendaItemId: input.agendaItemId,
      customTitle: null,
      startDateTime,
      endDateTime,
      locationId: agenda.locationId ?? null,
      notes: '',
      transportationNote: '',
      reminderEnabled: true,
      visibility: 'private',
      source: 'attendee',
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return ok(toItineraryItem(item), 201);
  } catch (e) {
    return fail(e);
  }
};
