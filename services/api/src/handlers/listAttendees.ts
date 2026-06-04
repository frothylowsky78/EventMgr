import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendeeCard } from '../lib/mappers';

/**
 * GET /events/{eventId}/attendees — yearbook directory.
 * Privacy: only attendees who opted into directory visibility are returned, and only the
 * public card projection (no email/phone/dietary/accessibility). Sorted by last name via GSI1.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAttendee(getAuth(event));
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

    const cards = (res.Items ?? [])
      .filter((a) => a.directoryVisible !== false && a.enabled !== false)
      .map(toAttendeeCard);

    return ok(cards);
  } catch (e) {
    return fail(e);
  }
};
