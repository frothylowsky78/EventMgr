import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toHelpRequest } from '../lib/mappers';
import { helpRequestUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * PATCH /admin/events/{eventId}/help-requests/{attendeeId}/{requestId} — assign or resolve.
 * Keeps the GSI1 status partition consistent so the triage queues stay correct.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const attendeeId = event.pathParameters?.attendeeId;
    const requestId = event.pathParameters?.requestId;
    if (!eventId || !attendeeId || !requestId) {
      throw new ApiException('VALIDATION', 'eventId, attendeeId and requestId are required');
    }

    const patch = parseBody(helpRequestUpdateSchema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.helpRequest(attendeeId, requestId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Help request not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    merged.GSI1PK = keys.helpRequestByStatus(eventId, merged.status).GSI1PK;

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'help.update', { requestId, status: merged.status });
    return ok(toHelpRequest(merged));
  } catch (e) {
    return fail(e);
  }
};
