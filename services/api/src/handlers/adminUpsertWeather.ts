import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toWeather } from '../lib/mappers';
import { weatherUpsertSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PUT /admin/events/{eventId}/weather — set the manual weather snapshot, daily forecast, and
 * notes/alerts (spec §4.17: admin-entered; a live API can replace this later).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(weatherUpsertSchema, event.body);
    const item = {
      ...keys.weather(eventId),
      entity: 'Weather',
      eventId,
      current: input.current ?? null,
      daily: input.daily ?? [],
      notes: input.notes ?? [],
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'weather.upsert', {});
    return ok(toWeather(item));
  } catch (e) {
    return fail(e);
  }
};
