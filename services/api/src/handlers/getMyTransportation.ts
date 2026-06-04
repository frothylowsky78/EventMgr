import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toTransportationItem } from '../lib/mappers';

/** GET /me/transportation — the caller's transportation assignments (own data only). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': attendeePk(attendeeId),
          ':sk': keys.transportPrefix,
        },
      })
    );

    const items = (res.Items ?? [])
      .map(toTransportationItem)
      .sort((a, b) => (a.pickupDateTime ?? '').localeCompare(b.pickupDateTime ?? ''));
    return ok(items);
  } catch (e) {
    return fail(e);
  }
};
