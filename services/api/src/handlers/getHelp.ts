import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { HelpContent } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toHelpContent } from '../lib/mappers';

/** GET /events/{eventId}/help — help contacts, topics, emergency + lost-and-found info. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    getAuth(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const res = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.helpContent(eventId) })
    );
    const empty: HelpContent = { eventId, contacts: [], topics: [] };
    return ok(res.Item ? toHelpContent(res.Item) : empty);
  } catch (e) {
    return fail(e);
  }
};
