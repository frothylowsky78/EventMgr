import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAgendaItem } from '../lib/mappers';
import { agendaUpdateSchema, parseBody } from '../lib/validation';
import { resolveLocationName } from '../lib/locations';

/**
 * PATCH /admin/events/{eventId}/agenda/{agendaId} — partial update (admin only).
 * Read-modify-write so we can recompute GSI1SK when date/startTime change.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    const agendaId = event.pathParameters?.agendaId;
    if (!eventId || !agendaId) {
      throw new ApiException('VALIDATION', 'eventId and agendaId are required');
    }

    const patch = parseBody(agendaUpdateSchema, event.body);

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.agendaItem(eventId, agendaId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Agenda item not found');

    // Re-resolve whenever locationId is part of the patch (including clearing it).
    const locationPatch =
      'locationId' in patch
        ? { locationId: patch.locationId ?? null,
            locationName: await resolveLocationName(eventId, patch.locationId) }
        : {};

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      ...locationPatch,
      updatedAt: new Date().toISOString(),
    };
    // Keep the GSI1 sort key consistent with possibly-updated date/startTime.
    merged.GSI1SK = keys.agendaGsi1Sk(merged.date, merged.startTime, agendaId);

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    return ok(toAgendaItem(merged));
  } catch (e) {
    return fail(e);
  }
};
