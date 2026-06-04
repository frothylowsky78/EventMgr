import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toEvent } from '../lib/mappers';

/** GET /events/{eventId} — backend-driven event profile & branding. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    getAuth(event); // any authenticated user may read the event profile
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const res = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.eventProfile(eventId) })
    );
    if (!res.Item) throw new ApiException('NOT_FOUND', 'Event not found');

    return ok(toEvent(res.Item));
  } catch (e) {
    return fail(e);
  }
};
