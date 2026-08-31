import type { AuthContext } from '@eventmgr/shared-types';

/**
 * Which event a request belongs to (pure half — no AWS import, so the unit tests can load it;
 * lib/eventId.ts wires in the real Dynamo lookup).
 *
 * The `custom:eventId` claim is a convenience, not the source of truth: the attendee record
 * always carries eventId, while the claim is only there if whoever created the Cognito user
 * remembered to set the attribute. Trusting the claim alone made three handlers fail for users
 * provisioned by hand.
 */
export type ProfileLoader = (
  attendeeId: string
) => Promise<{ eventId?: string } | undefined>;

/** Returns undefined when neither the claim nor a profile supplies one — callers decide. */
export async function resolveEventIdWith(
  auth: AuthContext,
  loadProfile: ProfileLoader
): Promise<string | undefined> {
  // The claim is authoritative when present, and costs no read.
  if (auth.eventId) return auth.eventId;
  // Staff tokens carry no attendeeId; they pass eventId explicitly instead.
  if (!auth.attendeeId) return undefined;
  const profile = await loadProfile(auth.attendeeId);
  return profile?.eventId || undefined;
}
