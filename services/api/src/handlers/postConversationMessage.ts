import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { ConversationParticipant } from '@eventmgr/shared-types';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { attendeePrincipal, staffPrincipal } from '../lib/keys';
import {
  appendMessage,
  otherAttendeeId,
  requireParticipant,
  resolvePrincipal,
} from '../lib/messaging';
import { assertNotBlocked } from '../lib/blocks';
import { messageCreateSchema, parseBody } from '../lib/validation';

/** Participant -> the partition key holding their pointer row. */
const keyFor = (p: ConversationParticipant): string =>
  p.type === 'staff' ? staffPrincipal(p.id) : attendeePrincipal(p.id);

/** POST /me/conversations/{id}/messages — append to an existing thread. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const principal = resolvePrincipal(auth, event.queryStringParameters?.eventId);
    const conversationId = event.pathParameters?.id;
    if (!conversationId) throw new ApiException('VALIDATION', 'conversation id is required');

    const input = parseBody(messageCreateSchema, event.body);
    const ref = await requireParticipant(principal.key, conversationId);
    const other = otherAttendeeId(ref, auth.attendeeId);
    if (auth.attendeeId && other) await assertNotBlocked(auth.attendeeId, other);
    const participants = (ref.participants as ConversationParticipant[]) ?? [];

    const message = await appendMessage({
      conversationId,
      eventId: ref.eventId as string,
      participants,
      principalKeys: participants.map(keyFor),
      sender: principal.participant,
      senderKey: principal.key,
      body: input.body,
    });

    return ok(message, 201);
  } catch (e) {
    return fail(e);
  }
};
