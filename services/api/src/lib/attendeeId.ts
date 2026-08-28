/**
 * Deterministic attendee id derived from the email, so re-imports update rather than duplicate.
 *
 * This MUST stay byte-identical to the derivation in handlers/adminImportAttendees.ts. If the
 * two ever diverge, a provisioned Cognito user carries a `custom:attendeeId` that no DynamoDB
 * record matches — the attendee signs in successfully and then sees an empty app, which is a
 * miserable failure to diagnose on event day.
 *
 * The handler currently still inlines its own copy; it was left untouched deliberately. Pointing
 * it at this function is a one-line change and would make this the single source of truth.
 */
export const deriveAttendeeId = (email: string, explicitId?: string): string =>
  explicitId?.trim() || `attendee_${Buffer.from(email).toString('hex').slice(0, 16)}`;
