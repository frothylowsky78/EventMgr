import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toEventLocation } from '../lib/mappers';
import { locationCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/** POST /admin/events/{eventId}/locations — create a named place. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(locationCreateSchema, event.body);
    const id = newId('location');
    const order = input.order ?? 0;
    const now = new Date().toISOString();

    const item = {
      ...keys.location(eventId, id),
      GSI1PK: keys.locationList(eventId).GSI1PK,
      GSI1SK: keys.locationGsi1Sk(order),
      entity: 'Location',
      id,
      eventId,
      name: input.name,
      detail: input.detail ?? '',
      address: input.address ?? '',
      mapLink: input.mapLink ?? '',
      order,
      published: input.published ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'location.create', { locationId: id });
    return ok(toEventLocation(item), 201);
  } catch (e) {
    return fail(e);
  }
};
