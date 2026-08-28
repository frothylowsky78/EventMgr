import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAgendaItem } from '../lib/mappers';
import { agendaCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { resolveLocationName } from '../lib/locations';

/** POST /admin/events/{eventId}/agenda — create an agenda item (admin only). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(agendaCreateSchema, event.body);
    // Resolve now so the item carries a printable location and a bad id is rejected here.
    const locationName = await resolveLocationName(eventId, input.locationId);
    const id = newId('agenda');
    const now = new Date().toISOString();

    const item = {
      ...keys.agendaItem(eventId, id),
      GSI1PK: keys.agendaList(eventId).GSI1PK,
      GSI1SK: keys.agendaGsi1Sk(input.date, input.startTime, id),
      entity: 'AgendaItem',
      id,
      eventId,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      locationId: input.locationId ?? null,
      locationName,
      category: input.category,
      description: input.description ?? '',
      speaker: input.speaker ?? '',
      dressCode: input.dressCode ?? '',
      mapLink: input.mapLink ?? '',
      required: input.required ?? false,
      capacity: input.capacity ?? null,
      eligibleTags: input.eligibleTags ?? [],
      reminderEnabled: input.reminderEnabled ?? true,
      published: input.published ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return ok(toAgendaItem(item), 201);
  } catch (e) {
    return fail(e);
  }
};
