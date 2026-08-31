import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Conversation, ConversationParticipant } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, isAdmin, ok } from '../lib/http';
import { TABLE_NAME, attendeePrincipal, keys, staffPrincipal } from '../lib/keys';
import {
  appendMessage,
  assertMessageable,
  conversationIdFor,
  conversationRef,
  loadAttendee,
  resolvePrincipal,
  toConversation,
} from '../lib/messaging';
import { conversationCreateSchema, parseBody } from '../lib/validation';
import { assertNotBlocked } from '../lib/blocks';

const keyFor = (p: ConversationParticipant): string =>
  p.type === 'staff' ? staffPrincipal(p.id) : attendeePrincipal(p.id);

/**
 * POST /me/conversations — start (or reuse) a thread and send the first message.
 *
 * Omit withAttendeeId to reach event staff. With it, the target must be both
 * directoryVisible and contactSharingOptIn (CF-7) — the existing privacy flags are the gate.
 *
 * The conversation id is derived from the sorted participant keys, so messaging the same
 * person twice continues the existing thread instead of forking a second one.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const queryEventId = event.queryStringParameters?.eventId;
    const principal = resolvePrincipal(auth, queryEventId);
    const input = parseBody(conversationCreateSchema, event.body);

    let other: ConversationParticipant;
    let eventId: string;

    if (input.withAttendeeId) {
      const target = await loadAttendee(input.withAttendeeId);
      eventId = target.eventId as string;
      // Staff may open a thread with anyone; guest-to-guest requires the opt-in.
      if (!isAdmin(auth)) {
        if (input.withAttendeeId === auth.attendeeId) {
          throw new ApiException('VALIDATION', 'You cannot message yourself');
        }
        assertMessageable(target);
        // Guideline 1.2: a block stops the thread being opened from either side.
        await assertNotBlocked(auth.attendeeId!, input.withAttendeeId);
      }
      other = {
        type: 'attendee',
        id: input.withAttendeeId,
        name: `${target.firstName ?? ''} ${target.lastName ?? ''}`.trim(),
      };
    } else {
      if (isAdmin(auth)) {
        throw new ApiException('VALIDATION', 'Staff must specify withAttendeeId');
      }
      const me = await loadAttendee(auth.attendeeId!);
      eventId = me.eventId as string;
      other = { type: 'staff', id: eventId, name: 'Event team' };
    }

    const otherKey = keyFor(other);
    const conversationId = conversationIdFor(principal.key, otherKey);
    const participants = [principal.participant, other];

    // Reuse an existing thread rather than creating a duplicate.
    const existing = await conversationRef(principal.key, conversationId);
    if (!existing) {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...keys.conversation(conversationId),
            entity: 'Conversation',
            id: conversationId,
            eventId,
            participants,
            createdAt: new Date().toISOString(),
          },
        })
      );
    }

    await appendMessage({
      conversationId,
      eventId,
      participants,
      principalKeys: [principal.key, otherKey],
      sender: principal.participant,
      senderKey: principal.key,
      body: input.body,
    });

    const ref = await conversationRef(principal.key, conversationId);
    const result: Conversation = toConversation(ref ?? {});
    return ok(result, existing ? 200 : 201);
  } catch (e) {
    return fail(e);
  }
};
