import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { createHash } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { deviceTokenSchema, parseBody } from '../lib/validation';
import { resolveEventId } from '../lib/eventId';

/**
 * POST /me/device-tokens — register (or refresh) a push device token for the caller.
 * The token id is derived from a hash of the device token so repeat registrations from the
 * same device upsert rather than duplicate. Supports multiple devices per attendee.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const input = parseBody(deviceTokenSchema, event.body);
    const eventId = await resolveEventId(auth);

    const tokenId = createHash('sha256').update(input.deviceToken).digest('hex').slice(0, 16);
    const now = new Date().toISOString();

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...keys.deviceToken(attendeeId, tokenId),
          GSI2PK: `EVENT#${eventId}#DEVICE`,
          GSI2SK: attendeeId,
          entity: 'DeviceToken',
          id: tokenId,
          attendeeId,
          eventId,
          platform: input.platform,
          deviceToken: input.deviceToken,
          enabled: true,
          createdAt: now,
          lastSeenAt: now,
        },
      })
    );

    return ok({ id: tokenId, platform: input.platform, enabled: true }, 201);
  } catch (e) {
    return fail(e);
  }
};
