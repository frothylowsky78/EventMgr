import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toDiningSeat } from '../lib/mappers';
import { parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

const seatSchema = z.object({
  attendeeId: z.string().min(1),
  table: z.string().max(50).optional(),
  seat: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});

/**
 * POST /admin/events/{eventId}/dining/{diningId}/seats — assign a personal seat.
 * A GSI1 partition (EVENT#{id}#DININGSEAT#{diningId}) lets push target this dining group.
 */
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

    const input = parseBody(seatSchema, event.body);
    const item = {
      ...keys.diningSeat(input.attendeeId, diningId),
      GSI1PK: keys.diningSeatByItem(eventId, diningId).GSI1PK,
      GSI1SK: input.attendeeId,
      entity: 'DiningSeat',
      diningId,
      eventId,
      attendeeId: input.attendeeId,
      table: input.table ?? '',
      seat: input.seat ?? '',
      note: input.note ?? '',
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'dining.seat.assign', {
      diningId,
      attendeeId: input.attendeeId,
    });
    return ok(toDiningSeat(item), 201);
  } catch (e) {
    return fail(e);
  }
};
