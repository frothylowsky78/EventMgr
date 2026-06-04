import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toHelpRequest } from '../lib/mappers';
import { helpRequestCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';

/**
 * POST /events/{eventId}/help-requests — submit a help/concierge request.
 * Lands in the `open` status partition so event staff can triage it (spec §4.15).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(helpRequestCreateSchema, event.body);
    const id = newId('help');
    const now = new Date().toISOString();

    const item = {
      ...keys.helpRequest(attendeeId, id),
      GSI1PK: keys.helpRequestByStatus(eventId, 'open').GSI1PK,
      GSI1SK: now,
      entity: 'HelpRequest',
      id,
      eventId,
      attendeeId,
      category: input.category,
      message: input.message,
      urgency: input.urgency ?? 'normal',
      contactPreference: input.contactPreference ?? '',
      photoKey: null,
      status: 'open',
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return ok(toHelpRequest(item), 201);
  } catch (e) {
    return fail(e);
  }
};
