import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toEventLocation } from '../lib/mappers';
import { locationUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PATCH /admin/events/{eventId}/locations/{locationId} — partial update.
 * Renaming does NOT rewrite the locationName already denormalized onto existing agenda items;
 * re-save those items to pick up the new name.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const locationId = event.pathParameters?.locationId;
    if (!eventId || !locationId) {
      throw new ApiException('VALIDATION', 'eventId and locationId are required');
    }

    const patch = parseBody(locationUpdateSchema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.location(eventId, locationId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Location not found');

    const merged: Record<string, unknown> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    // Keep the GSI1 sort key aligned with a possibly-updated order.
    merged.GSI1SK = keys.locationGsi1Sk((merged.order as number) ?? 0);

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'location.update', { locationId });
    return ok(toEventLocation(merged));
  } catch (e) {
    return fail(e);
  }
};
