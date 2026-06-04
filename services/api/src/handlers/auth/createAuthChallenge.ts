import type { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../lib/dynamo';
import { TABLE_NAME, keys } from '../../lib/keys';

/**
 * Sets up the custom challenge. The attendee already knows their access code (issued at
 * registration), so we do NOT send anything here — we simply load the expected code hash from the
 * attendee record and stash it in privateChallengeParameters for the verify step.
 */
export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  // Tell the client what kind of challenge to render.
  event.response.publicChallengeParameters = { challengeType: 'ACCESS_CODE' };

  let expectedHash = '';
  let enabled = 'true';

  const email = (event.request.userAttributes.email ?? event.userName ?? '').toLowerCase();
  if (email) {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.attendeeByEmail(email).GSI2PK },
        Limit: 1,
      })
    );
    const attendee = res.Items?.[0];
    if (attendee) {
      expectedHash = attendee.accessCodeHash ?? '';
      enabled = attendee.enabled === false ? 'false' : 'true';
    }
  }

  // Only the verify trigger can read privateChallengeParameters — never returned to the client.
  event.response.privateChallengeParameters = { expectedHash, enabled };
  return event;
};
