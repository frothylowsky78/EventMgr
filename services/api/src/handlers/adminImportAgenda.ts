import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, getRawBody, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { parseCsv, splitMulti, parseBool } from '../lib/csv';
import { agendaCreateSchema } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/agenda/import — bulk create agenda items from CSV
 * (tools/import-templates/agenda.csv). Each row is validated with the agenda schema.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const rows = parseCsv(getRawBody(event));
    if (rows.length === 0) throw new ApiException('VALIDATION', 'CSV has no data rows');

    let imported = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const candidate = {
        title: r.title,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime || undefined,
        locationId: r.locationId || undefined,
        category: r.category,
        description: r.description || undefined,
        speaker: r.speaker || undefined,
        dressCode: r.dressCode || undefined,
        required: r.required ? parseBool(r.required) : undefined,
        capacity: r.capacity ? Number(r.capacity) : undefined,
        eligibleTags: r.eligibleTags ? splitMulti(r.eligibleTags) : undefined,
        published: r.published ? parseBool(r.published) : undefined,
      };
      const parsed = agendaCreateSchema.safeParse(candidate);
      if (!parsed.success) {
        errors.push({ row: i + 2, message: parsed.error.issues[0]?.message ?? 'invalid row' });
        continue;
      }
      const input = parsed.data;
      const id = newId('agenda');
      const now = new Date().toISOString();
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...keys.agendaItem(eventId, id),
            GSI1PK: keys.agendaList(eventId).GSI1PK,
            GSI1SK: keys.agendaGsi1Sk(input.date, input.startTime, id),
            entity: 'AgendaItem',
            id,
            eventId,
            ...input,
            required: input.required ?? false,
            eligibleTags: input.eligibleTags ?? [],
            reminderEnabled: input.reminderEnabled ?? true,
            published: input.published ?? true,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
      imported++;
    }

    await audit(eventId, auth.userId, 'agenda.import', { imported, errors: errors.length });
    return ok({ imported, errors });
  } catch (e) {
    return fail(e);
  }
};
