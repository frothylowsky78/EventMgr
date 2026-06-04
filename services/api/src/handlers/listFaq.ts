import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toFaqItem } from '../lib/mappers';

/**
 * GET /events/{eventId}/faq — published FAQ items. Featured items first, then by
 * category#order (the GSI1 sort key). Search is done client-side over this small set.
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
        ExpressionAttributeValues: { ':pk': keys.faqList(eventId).GSI1PK },
      })
    );

    const items = (res.Items ?? [])
      .map(toFaqItem)
      .filter((f) => f.published)
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return `${a.category}${a.order}`.localeCompare(`${b.category}${b.order}`);
      });

    return ok(items);
  } catch (e) {
    return fail(e);
  }
};
