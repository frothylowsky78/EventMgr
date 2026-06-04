import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toMapLocation } from '../lib/mappers';
import { mapUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/** PATCH /admin/events/{eventId}/maps/{mapId} — partial update. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const mapId = event.pathParameters?.mapId;
    if (!eventId || !mapId) {
      throw new ApiException('VALIDATION', 'eventId and mapId are required');
    }

    const patch = parseBody(mapUpdateSchema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.mapLocation(eventId, mapId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Map not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    merged.GSI1SK = keys.mapGsi1Sk(merged.order ?? 0);

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'map.update', { mapId });
    return ok(toMapLocation(merged));
  } catch (e) {
    return fail(e);
  }
};
