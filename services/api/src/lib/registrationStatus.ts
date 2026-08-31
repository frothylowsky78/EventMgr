import type { RegistrationAction, RegistrationStatus } from '@eventmgr/shared-types';

/**
 * Pure registration-progress rules (spec §4.3). Deliberately free of any AWS import so the unit
 * tests can load it directly — lib/registration.ts holds the Dynamo side.
 *
 * registrationStatus is always derived from the event's action list and the attendee's completed
 * subset, never set directly, so the Home banner and the checklist can't disagree.
 */

/** Both values that mean "registration finished"; 'submitted' predates attendee self-service. */
const DONE: readonly string[] = ['complete', 'submitted'];

export const isRegistrationDone = (status: string | undefined): boolean =>
  status !== undefined && DONE.includes(status);

export function computeRegistrationStatus(
  completed: string[],
  actions: RegistrationAction[]
): RegistrationStatus {
  const required = actions.map((a) => a.id).filter(Boolean);
  // Nothing to do is trivially done; an event with no actions must not strand guests on a
  // banner they can never clear.
  if (required.length === 0) return 'complete';
  const done = required.filter((id) => completed.includes(id)).length;
  if (done === 0) return 'not_started';
  return done === required.length ? 'complete' : 'in_progress';
}
