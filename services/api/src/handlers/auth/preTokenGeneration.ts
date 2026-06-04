import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';

/**
 * Injects the attendee/event context into the token so the API can scope `/me/*` data to the
 * caller without an extra lookup. Values are stored as Cognito custom attributes
 * (custom:attendeeId, custom:eventId) at user creation / import time.
 */
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  const attrs = event.request.userAttributes ?? {};
  const claims: Record<string, string> = {};

  if (attrs['custom:attendeeId']) claims['custom:attendeeId'] = attrs['custom:attendeeId'];
  if (attrs['custom:eventId']) claims['custom:eventId'] = attrs['custom:eventId'];

  if (Object.keys(claims).length > 0) {
    event.response.claimsOverrideDetails = {
      claimsToAddOrOverride: claims,
    };
  }
  return event;
};
