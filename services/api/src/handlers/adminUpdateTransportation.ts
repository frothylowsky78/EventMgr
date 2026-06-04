import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toTransportationItem } from '../lib/mappers';
import { transportationUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PATCH /admin/events/{eventId}/transportation/{attendeeId}/{transportId}
 * Partial update (e.g. status -> delayed/changed). Keeps the group GSI consistent.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const attendeeId = event.pathParameters?.attendeeId;
    const transportId = event.pathParameters?.transportId;
    if (!eventId || !attendeeId || !transportId) {
      throw new ApiException('VALIDATION', 'eventId, attendeeId and transportId are required');
    }

    const patch = parseBody(transportationUpdateSchema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.transportation(attendeeId, transportId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Transportation item not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const group = merged.group ?? 'unassigned';
    merged.GSI1PK = keys.transportationByGroup(eventId, group).GSI1PK;
    merged.GSI1SK = `${merged.pickupDateTime ?? ''}#${attendeeId}`;

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'transportation.update', { attendeeId, transportId });
    return ok(toTransportationItem(merged));
  } catch (e) {
    return fail(e);
  }
};
