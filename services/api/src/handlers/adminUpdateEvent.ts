import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toEvent } from '../lib/mappers';
import { eventUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PATCH /admin/events/{eventId} — partial update of the event profile (admin only).
 * Read-modify-write, matching the other admin update handlers.
 *
 * Everything on the mobile home screen comes from this record — name, venue, dates, hero
 * image and the theme colors — so it has to be editable without a release.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const patch = parseBody(eventUpdateSchema, event.body);

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.eventProfile(eventId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Event not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    // Branding is a nested object: merge field-by-field so sending only primaryColor doesn't
    // wipe the logo and hero image.
    if (patch.branding) {
      merged.branding = { ...(existing.Item.branding ?? {}), ...patch.branding };
    }

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'event.update', { fields: Object.keys(patch) });
    return ok(toEvent(merged));
  } catch (e) {
    return fail(e);
  }
};
