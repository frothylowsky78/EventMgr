import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, requireAdmin, text } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendee } from '../lib/mappers';
import { toCsv } from '../lib/csv';

const COLUMNS = [
  'id', 'firstName', 'lastName', 'email', 'phone', 'company', 'title', 'city',
  'dietaryRestrictions', 'tags', 'registrationStatus', 'directoryVisible', 'contactSharingOptIn',
];

/** GET /admin/events/{eventId}/attendees/export — full attendee list as CSV. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.attendeeList(eventId).GSI1PK },
      })
    );

    const rows = (res.Items ?? []).map(toAttendee).map((a) => ({
      ...a,
      dietaryRestrictions: a.dietaryRestrictions.join(';'),
      tags: a.tags.join(';'),
    }));

    return text(toCsv(COLUMNS, rows), 'text/csv; charset=utf-8', `attendees-${eventId}.csv`);
  } catch (e) {
    return fail(e);
  }
};
