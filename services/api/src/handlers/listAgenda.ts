import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAgendaItem } from '../lib/mappers';

/**
 * GET /events/{eventId}/agenda — published agenda items, ordered by date#startTime via GSI1.
 * Attendee-facing: unpublished items are filtered out.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    getAuth(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.agendaList(eventId).GSI1PK },
      })
    );

    const items = (res.Items ?? [])
      .map(toAgendaItem)
      .filter((a) => a.published);

    return ok(items);
  } catch (e) {
    return fail(e);
  }
};
