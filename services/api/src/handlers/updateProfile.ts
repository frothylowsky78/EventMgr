import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendee } from '../lib/mappers';
import { presignProfileIfKey } from '../lib/s3';
import { profileUpdateSchema, parseBody } from '../lib/validation';

/**
 * PATCH /me/profile — attendee edits their own profile (editable subset only).
 * Cannot change identity/registration fields. directoryVisible / contactSharingOptIn here let the
 * attendee control their own privacy (spec §8.4).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const patch = parseBody(profileUpdateSchema, event.body);

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Attendee profile not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    return ok({
      ...toAttendee(merged),
      profilePhotoUrl: await presignProfileIfKey(merged.profilePhotoKey, merged.profilePhotoUrl),
    });
  } catch (e) {
    return fail(e);
  }
};
