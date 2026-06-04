import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, requireAdmin, text } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toFeedback } from '../lib/mappers';
import { toCsv } from '../lib/csv';

const COLUMNS = ['targetId', 'type', 'attendeeId', 'rating', 'wouldRecommend', 'issueFlag', 'comments', 'createdAt'];

/** GET /admin/events/{eventId}/feedback/export?targetId=event — feedback as CSV. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');
    const targetId = event.queryStringParameters?.targetId ?? 'event';

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.feedbackByTarget(eventId, targetId).GSI1PK },
      })
    );

    const rows = (res.Items ?? []).map(toFeedback).map((f) => ({
      ...f,
      attendeeId: f.anonymous ? 'anonymous' : f.attendeeId,
    }));

    return text(toCsv(COLUMNS, rows), 'text/csv; charset=utf-8', `feedback-${targetId}.csv`);
  } catch (e) {
    return fail(e);
  }
};
