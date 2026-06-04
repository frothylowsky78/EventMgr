import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toHelpContent } from '../lib/mappers';
import { helpContentUpsertSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/** PUT /admin/events/{eventId}/help — set help contacts, topics, emergency + lost-and-found. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(helpContentUpsertSchema, event.body);
    const item = {
      ...keys.helpContent(eventId),
      entity: 'HelpContent',
      eventId,
      contacts: input.contacts ?? [],
      topics: input.topics ?? [],
      emergencyText: input.emergencyText ?? '',
      lostAndFound: input.lostAndFound ?? '',
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'help.content.upsert', {});
    return ok(toHelpContent(item));
  } catch (e) {
    return fail(e);
  }
};
