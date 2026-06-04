import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toDiningItem } from '../lib/mappers';
import { diningUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/** PATCH /admin/events/{eventId}/dining/{diningId} — partial update. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const diningId = event.pathParameters?.diningId;
    if (!eventId || !diningId) {
      throw new ApiException('VALIDATION', 'eventId and diningId are required');
    }

    const patch = parseBody(diningUpdateSchema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.diningItem(eventId, diningId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Dining item not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    merged.GSI1SK = keys.diningGsi1Sk(merged.date, merged.startTime, diningId);

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'dining.update', { diningId });
    return ok(toDiningItem(merged));
  } catch (e) {
    return fail(e);
  }
};
