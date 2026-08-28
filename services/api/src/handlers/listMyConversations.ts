import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { fail, getAuth, ok } from '../lib/http';
import { listRefs, resolvePrincipal, toConversation } from '../lib/messaging';

/**
 * GET /me/conversations — the caller's threads, newest first.
 *
 * Serves the admin inbox too: for an admin the principal resolves to the shared per-event
 * staff partition (?eventId=), which is why staff need no separate route.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const principal = resolvePrincipal(auth, event.queryStringParameters?.eventId);

    const refs = await listRefs(principal.key);
    const conversations = refs
      .map(toConversation)
      // Sorted here rather than by sort key: keeping conversationId in the SK means the
      // pointer is a stable single-row update instead of a delete+put on every message.
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    return ok(conversations);
  } catch (e) {
    return fail(e);
  }
};
