import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toMapLocation } from '../lib/mappers';
import { presignAssetIfKey } from '../lib/s3';

/** GET /admin/events/{eventId}/maps — all map locations incl. unpublished. */
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
        ExpressionAttributeValues: { ':pk': keys.mapList(eventId).GSI1PK },
      })
    );
    const items = await Promise.all(
      (res.Items ?? []).map(async (i) => {
        const m = toMapLocation(i);
        m.imageUrl = await presignAssetIfKey(i.imageKey, m.imageUrl);
        return m;
      })
    );
    return ok(items);
  } catch (e) {
    return fail(e);
  }
};
