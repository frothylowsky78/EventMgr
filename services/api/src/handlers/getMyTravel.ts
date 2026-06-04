import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toTravelDetail } from '../lib/mappers';

/** GET /me/travel — the caller's personal travel detail (own data only). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);

    const res = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.travel(attendeeId) })
    );
    // No travel yet is a valid state — return null rather than 404.
    return ok(res.Item ? toTravelDetail(res.Item) : null);
  } catch (e) {
    return fail(e);
  }
};
