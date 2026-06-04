import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toTravelDetail } from '../lib/mappers';

/** GET /admin/events/{eventId}/attendees/{attendeeId}/travel — current travel (admin). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const attendeeId = event.pathParameters?.attendeeId;
    if (!attendeeId) throw new ApiException('VALIDATION', 'attendeeId is required');

    const res = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.travel(attendeeId) })
    );
    return ok(res.Item ? toTravelDetail(res.Item) : null);
  } catch (e) {
    return fail(e);
  }
};
