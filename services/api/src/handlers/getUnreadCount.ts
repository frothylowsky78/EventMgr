import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { UnreadCount } from '@eventmgr/shared-types';
import { fail, getAuth, ok } from '../lib/http';
import { listRefs, resolvePrincipal } from '../lib/messaging';

/**
 * GET /me/unread-count — total unread messages for the badge.
 *
 * One query against the caller's pointer rows. This is the endpoint the app polls on
 * foreground, so it must stay cheap; the per-conversation counters are maintained on write
 * precisely so this never has to scan messages.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const principal = resolvePrincipal(auth, event.queryStringParameters?.eventId);

    const refs = await listRefs(principal.key);
    const unread = refs.reduce((sum, r) => sum + ((r.unreadCount as number) ?? 0), 0);

    const result: UnreadCount = { unread };
    return ok(result);
  } catch (e) {
    return fail(e);
  }
};
