import type { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';
import { accessCodeMatches } from '../../lib/accessCode';

/**
 * Validates the access code the attendee submitted against the expected hash that
 * createAuthChallenge loaded. Disabled accounts never pass.
 *
 * An unknown email reaches here exactly like a known one — createAuthChallenge always writes
 * both private parameters, with an empty expectedHash when it found no attendee. There is no
 * early return, and the hash is computed either way, so an unknown email cannot be told from a
 * wrong code by response shape or by how long the answer took.
 */
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expectedHash = event.request.privateChallengeParameters?.expectedHash ?? '';
  const enabled = event.request.privateChallengeParameters?.enabled ?? 'true';
  const answer = event.request.challengeAnswer ?? '';
  const email = (event.request.userAttributes.email ?? event.userName ?? '').toLowerCase();

  // Computed before the guards, not short-circuited past them: skipping the hash when there is
  // no expected value would make an unknown email measurably faster to probe than a wrong code.
  const matches = accessCodeMatches(email, answer, expectedHash);

  event.response.answerCorrect = enabled === 'true' && expectedHash.length > 0 && matches;

  return event;
};
