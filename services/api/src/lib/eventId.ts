import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { AuthContext } from '@eventmgr/shared-types';
import { ddb } from './dynamo';
import { ApiException } from './http';
import { TABLE_NAME, keys } from './keys';
import { resolveEventIdWith } from './eventScope';

export { resolveEventIdWith } from './eventScope';

const loadProfile = async (attendeeId: string): Promise<{ eventId?: string } | undefined> => {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
  );
  return res.Item as { eventId?: string } | undefined;
};

/**
 * The caller's event: the `custom:eventId` claim when present, otherwise read off their attendee
 * record. Only throws when neither exists — a token with no event and no attendee behind it.
 */
export async function resolveEventId(auth: AuthContext): Promise<string> {
  const eventId = await resolveEventIdWith(auth, loadProfile);
  if (!eventId) throw new ApiException('FORBIDDEN', 'Token is not scoped to an event');
  return eventId;
}
