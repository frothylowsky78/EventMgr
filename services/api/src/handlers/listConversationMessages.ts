import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { markRead, requireParticipant, resolvePrincipal, toMessage } from '../lib/messaging';

/**
 * GET /me/conversations/{id}/messages — the thread, oldest first, and marks it read.
 *
 * Authorization is the participant pointer: you only have one if you are in the conversation,
 * so a missing pointer is a 404 rather than a leak that the thread exists.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const principal = resolvePrincipal(auth, event.queryStringParameters?.eventId);
    const conversationId = event.pathParameters?.id;
    if (!conversationId) throw new ApiException('VALIDATION', 'conversation id is required');

    await requireParticipant(principal.key, conversationId);

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': keys.conversation(conversationId).PK,
          ':sk': keys.messagePrefix,
        },
      })
    );

    // SK is MSG#{createdAt}#{id}, so results are already chronological.
    const messages = (res.Items ?? []).map(toMessage);
    await markRead(principal.key, conversationId);

    return ok(messages);
  } catch (e) {
    return fail(e);
  }
};
