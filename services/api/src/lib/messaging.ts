import { createHash } from 'node:crypto';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { AuthContext, Conversation, ConversationParticipant, Message } from '@eventmgr/shared-types';
import { ddb } from './dynamo';
import { ApiException, isAdmin } from './http';
import { TABLE_NAME, attendeePrincipal, keys, staffPrincipal } from './keys';
import { newId } from './id';

/**
 * Messaging internals shared by the five conversation handlers.
 *
 * Polled, not socket-based (docs/open-questions.md A13): with push cut from v1 a WebSocket
 * cannot wake a backgrounded app, so it would buy nothing a user would notice.
 */

export interface Principal {
  /** Partition key for this participant's conversation pointers. */
  key: string;
  participant: ConversationParticipant;
}

/**
 * Who is calling, in messaging terms. Attendees are themselves; any admin is the shared
 * per-event staff inbox, which is what lets the admin portal reuse these endpoints instead
 * of needing its own routes.
 */
export function resolvePrincipal(auth: AuthContext, eventId: string | undefined): Principal {
  if (isAdmin(auth)) {
    if (!eventId) {
      throw new ApiException('VALIDATION', 'eventId is required for staff');
    }
    return {
      key: staffPrincipal(eventId),
      participant: { type: 'staff', id: eventId, name: 'Event team' },
    };
  }
  if (!auth.attendeeId) {
    throw new ApiException('FORBIDDEN', 'No attendee context on this token');
  }
  return {
    key: attendeePrincipal(auth.attendeeId),
    participant: { type: 'attendee', id: auth.attendeeId, name: auth.email ?? 'Attendee' },
  };
}

/**
 * Stable id from the sorted participant keys, so "message Jane" twice reuses one thread
 * instead of forking a second.
 */
export const conversationIdFor = (a: string, b: string): string =>
  `conv_${createHash('sha256').update([a, b].sort().join('|')).digest('hex').slice(0, 16)}`;

/** Loads an attendee profile, or throws NOT_FOUND. */
export async function loadAttendee(attendeeId: string): Promise<Record<string, unknown>> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
  );
  if (!res.Item) throw new ApiException('NOT_FOUND', 'Attendee not found');
  return res.Item;
}

/**
 * Attendee-to-attendee is gated on the existing privacy flags (CF-7): the recipient must be
 * both directory-visible and opted in to contact sharing. Staff conversations are exempt —
 * reaching the event team is not a privacy decision.
 */
export function assertMessageable(target: Record<string, unknown>): void {
  const visible = target.directoryVisible !== false;
  const optedIn = target.contactSharingOptIn === true;
  if (!visible || !optedIn) {
    throw new ApiException(
      'FORBIDDEN',
      'This attendee has not opted in to being contacted by other guests.'
    );
  }
}

/** The caller's pointer row, which also carries their unread counter. */
export async function conversationRef(
  principalKey: string,
  conversationId: string
): Promise<Record<string, unknown> | undefined> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.conversationRef(principalKey, conversationId),
    })
  );
  return res.Item;
}

export async function requireParticipant(
  principalKey: string,
  conversationId: string
): Promise<Record<string, unknown>> {
  const ref = await conversationRef(principalKey, conversationId);
  // Absence of a pointer is the authorization check: you only get one when you're in the thread.
  if (!ref) throw new ApiException('NOT_FOUND', 'Conversation not found');
  return ref;
}

/**
 * The other attendee in a thread, if any. Staff threads have no counterpart attendee, which is
 * why blocking never applies to reaching the event team.
 */
export function otherAttendeeId(
  ref: Record<string, any>,
  meId: string | undefined
): string | undefined {
  const participants = (ref.participants as ConversationParticipant[] | undefined) ?? [];
  return participants.find((p) => p.type === 'attendee' && p.id !== meId)?.id;
}

export async function listRefs(principalKey: string): Promise<Record<string, unknown>[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': principalKey,
        ':sk': keys.conversationRefPrefix,
      },
    })
  );
  return res.Items ?? [];
}

export const toConversation = (ref: Record<string, any>): Conversation => ({
  id: ref.conversationId,
  eventId: ref.eventId,
  participants: ref.participants ?? [],
  lastMessageAt: ref.lastMessageAt ?? '',
  lastMessagePreview: ref.lastMessagePreview ?? '',
  unreadCount: ref.unreadCount ?? 0,
});

export const toMessage = (i: Record<string, any>): Message => ({
  id: i.id,
  conversationId: i.conversationId,
  senderType: i.senderType,
  senderId: i.senderId,
  senderName: i.senderName ?? '',
  body: i.body ?? '',
  createdAt: i.createdAt,
  reported: i.reported === true,
  reportCount: i.reportCount ?? 0,
});

/**
 * Appends a message and updates every participant's pointer: the sender's is marked read,
 * everyone else's unread counter goes up. That counter is what makes the unread badge a
 * single query rather than a scan of every thread.
 */
export async function appendMessage(opts: {
  conversationId: string;
  eventId: string;
  participants: ConversationParticipant[];
  principalKeys: string[];
  sender: ConversationParticipant;
  senderKey: string;
  body: string;
}): Promise<Message> {
  const createdAt = new Date().toISOString();
  const id = newId('msg');
  const item = {
    ...keys.message(opts.conversationId, createdAt, id),
    entity: 'Message',
    id,
    conversationId: opts.conversationId,
    eventId: opts.eventId,
    senderType: opts.sender.type,
    senderId: opts.sender.id,
    senderName: opts.sender.name,
    body: opts.body,
    createdAt,
  };
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  const preview = opts.body.length > 140 ? `${opts.body.slice(0, 137)}…` : opts.body;
  await Promise.all(
    opts.principalKeys.map((key) =>
      ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: keys.conversationRef(key, opts.conversationId),
          UpdateExpression:
            'SET conversationId = :cid, eventId = :eid, participants = :p, ' +
            'lastMessageAt = :at, lastMessagePreview = :prev, entity = :e ' +
            'ADD unreadCount :inc',
          ExpressionAttributeValues: {
            ':cid': opts.conversationId,
            ':eid': opts.eventId,
            ':p': opts.participants,
            ':at': createdAt,
            ':prev': preview,
            ':e': 'ConversationRef',
            ':inc': key === opts.senderKey ? 0 : 1,
          },
        })
      )
    )
  );

  return toMessage(item);
}

/** Clears the caller's unread counter — called when they open the thread. */
export async function markRead(principalKey: string, conversationId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.conversationRef(principalKey, conversationId),
      UpdateExpression: 'SET unreadCount = :zero, lastReadAt = :now',
      ExpressionAttributeValues: { ':zero': 0, ':now': new Date().toISOString() },
    })
  );
}
