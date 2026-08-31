import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo';
import { ApiException } from './http';
import { TABLE_NAME, keys } from './keys';

/**
 * Attendee blocking (App Store guideline 1.2). The list lives on the attendee's own profile
 * row, so reading it is the same GetCommand every /me handler already does.
 *
 * Blocking is symmetric in effect: whichever side pressed the button, neither sees the other's
 * content and neither can open or continue a thread with the other.
 */

export const blockedIdsOf = (item: Record<string, any> | undefined): string[] =>
  (item?.blockedAttendeeIds as string[] | undefined) ?? [];

/** The caller's block list; empty for staff tokens, which have no attendee row. */
export async function loadBlockedIds(attendeeId: string | undefined): Promise<string[]> {
  if (!attendeeId) return [];
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
  );
  return blockedIdsOf(res.Item);
}

/** True when either attendee has blocked the other. */
export async function blockExists(a: string, b: string): Promise<boolean> {
  const [aBlocks, bBlocks] = await Promise.all([loadBlockedIds(a), loadBlockedIds(b)]);
  return aBlocks.includes(b) || bBlocks.includes(a);
}

/**
 * Refuses a messaging action when a block exists in either direction. The message deliberately
 * does not say who blocked whom — that would leak the other party's action back to them.
 */
export async function assertNotBlocked(a: string, b: string): Promise<void> {
  if (await blockExists(a, b)) {
    throw new ApiException('FORBIDDEN', 'This conversation is unavailable.');
  }
}
