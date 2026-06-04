import type { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';
import { accessCodeMatches } from '../../lib/accessCode';

/**
 * Validates the access code the attendee submitted against the expected hash that
 * createAuthChallenge loaded. Disabled accounts never pass.
 */
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expectedHash = event.request.privateChallengeParameters?.expectedHash ?? '';
  const enabled = event.request.privateChallengeParameters?.enabled ?? 'true';
  const answer = event.request.challengeAnswer ?? '';
  const email = (event.request.userAttributes.email ?? event.userName ?? '').toLowerCase();

  event.response.answerCorrect =
    enabled === 'true' &&
    expectedHash.length > 0 &&
    accessCodeMatches(email, answer, expectedHash);

  return event;
};
