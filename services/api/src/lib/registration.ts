import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { RegistrationAction } from '@eventmgr/shared-types';
import { ddb } from './dynamo';
import { ApiException } from './http';
import { TABLE_NAME, keys } from './keys';
import { computeRegistrationStatus } from './registrationStatus';

export { computeRegistrationStatus, isRegistrationDone } from './registrationStatus';

/**
 * Registration progress (spec §4.3). The event owns the list of required actions; each attendee
 * carries the subset they've finished, and registrationStatus is always derived from the two —
 * never set directly, so the banner and the checklist can't disagree.
 */

/**
 * Adds or removes one action on an attendee and recomputes their status.
 *
 * `strict` is the difference between the two callers. The explicit endpoint passes true and
 * wants 404s for an unknown attendee or an action the event doesn't define. The auto-complete
 * hooks pass false: they ride along on a photo upload or a profile save, and registration
 * bookkeeping must never be the reason that primary write fails.
 */
async function updateCompletion(
  attendeeId: string,
  actionId: string,
  add: boolean,
  strict: boolean
): Promise<Record<string, any> | undefined> {
  const attendeeRes = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
  );
  const attendee = attendeeRes.Item;
  if (!attendee) {
    if (strict) throw new ApiException('NOT_FOUND', 'Attendee profile not found');
    return undefined;
  }

  const eventRes = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.eventProfile(attendee.eventId as string) })
  );
  const actions = ((eventRes.Item?.registrationActions as RegistrationAction[]) ?? []).filter(
    (a) => a?.id
  );

  // An action id the event doesn't define is a client bug when explicit, and simply "this event
  // doesn't ask for that" when automatic.
  if (!actions.some((a) => a.id === actionId)) {
    if (strict) {
      throw new ApiException('NOT_FOUND', `No registration action "${actionId}" on this event`);
    }
    return undefined;
  }

  const current = (attendee.completedRegistrationActions as string[] | undefined) ?? [];
  const completed = add
    ? [...new Set([...current, actionId])]
    : current.filter((id) => id !== actionId);

  // Nothing changed — skip the write, but still return the attendee so callers can map it.
  if (completed.length === current.length && add === current.includes(actionId)) {
    return attendee;
  }

  const registrationStatus = computeRegistrationStatus(completed, actions);
  const updated = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.attendeeProfile(attendeeId),
      UpdateExpression:
        'SET completedRegistrationActions = :done, registrationStatus = :status, updatedAt = :now',
      ExpressionAttributeValues: {
        ':done': completed,
        ':status': registrationStatus,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );
  return updated.Attributes;
}

/** Explicit completion from POST/DELETE /me/registration/actions/{actionId}/complete. */
export const setActionComplete = (
  attendeeId: string,
  actionId: string,
  add: boolean
): Promise<Record<string, any> | undefined> => updateCompletion(attendeeId, actionId, add, true);

/**
 * Auto-completion: the data proves the action is done, so don't ask the guest to confirm it.
 * Best-effort by design — a failure here is logged, never surfaced, and never rolls back the
 * write that triggered it.
 */
export async function autoCompleteAction(attendeeId: string, actionId: string): Promise<void> {
  try {
    await updateCompletion(attendeeId, actionId, true, false);
  } catch (e) {
    console.warn(`Registration auto-complete skipped for ${actionId}`, e);
  }
}
