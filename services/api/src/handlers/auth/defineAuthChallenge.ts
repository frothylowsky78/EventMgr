import type { DefineAuthChallengeTriggerHandler } from 'aws-lambda';

/**
 * Cognito custom-auth orchestrator for the email + access-code (passwordless) flow.
 * - First round: issue a CUSTOM_CHALLENGE.
 * - If the access code was answered correctly: issue tokens.
 * - Otherwise allow up to 3 attempts, then fail.
 */
export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const sessions = event.request.session ?? [];

  if (sessions.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    return event;
  }

  const last = sessions[sessions.length - 1];
  if (last.challengeName === 'CUSTOM_CHALLENGE' && last.challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  if (sessions.length >= 3) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  return event;
};
