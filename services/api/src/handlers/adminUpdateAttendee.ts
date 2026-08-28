import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendee } from '../lib/mappers';
import { attendeeUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PATCH /admin/events/{eventId}/attendees/{attendeeId} — partial update (admin only).
 * Today this covers tags, which drive notification audience targeting (see lib/audience.ts);
 * before this existed, tags could only be set by re-importing the attendee CSV.
 * Read-modify-write, matching the other admin update handlers.
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

    const patch = parseBody(attendeeUpdateSchema, event.body);

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Attendee not found');
    // The attendee is addressed by its own PK, so confirm it belongs to this event.
    if (existing.Item.eventId !== eventId) {
      throw new ApiException('NOT_FOUND', 'Attendee not found');
    }

    const merged: Record<string, unknown> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    // Trim, drop blanks, de-duplicate. Case is left as typed to match how the CSV import
    // stores tags; note that audience matching in lib/audience.ts is case-sensitive.
    if (patch.tags) {
      merged.tags = [...new Set(patch.tags.map((t) => t.trim()).filter(Boolean))];
    }

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'attendee.update', { attendeeId });
    return ok(toAttendee(merged));
  } catch (e) {
    return fail(e);
  }
};
