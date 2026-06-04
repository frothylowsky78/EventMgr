import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toMapLocation } from '../lib/mappers';
import { mapCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/** POST /admin/events/{eventId}/maps — create a map location. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(mapCreateSchema, event.body);
    const id = newId('map');
    const order = input.order ?? 0;
    const now = new Date().toISOString();

    const item = {
      ...keys.mapLocation(eventId, id),
      GSI1PK: keys.mapList(eventId).GSI1PK,
      GSI1SK: keys.mapGsi1Sk(order),
      entity: 'MapLocation',
      id,
      eventId,
      title: input.title,
      type: input.type,
      imageUrl: input.imageUrl ?? '',
      description: input.description ?? '',
      address: input.address ?? '',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      pins: input.pins ?? [],
      order,
      published: input.published ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'map.create', { mapId: id });
    return ok(toMapLocation(item), 201);
  } catch (e) {
    return fail(e);
  }
};
