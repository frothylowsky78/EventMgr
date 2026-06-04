import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toFeedback } from '../lib/mappers';

/**
 * GET /admin/events/{eventId}/feedback?targetId=event — feedback for a target, with a simple
 * aggregate (count + average rating). Anonymous submissions omit the attendeeId.
 */
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

    const items = (res.Items ?? []).map(toFeedback).map((f) =>
      f.anonymous ? { ...f, attendeeId: 'anonymous' } : f
    );
    const count = items.length;
    const average =
      count === 0 ? 0 : items.reduce((s, f) => s + f.rating, 0) / count;

    return ok({ targetId, count, averageRating: Number(average.toFixed(2)), items });
  } catch (e) {
    return fail(e);
  }
};
