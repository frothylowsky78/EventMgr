import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { UploadTicket } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { PROFILE_BUCKET, presignUploadTo, isImageType, extensionFor } from '../lib/s3';
import { profilePhotoSchema, parseBody } from '../lib/validation';
import { autoCompleteAction } from '../lib/registration';

/**
 * POST /me/profile-photo/upload-url — pre-signed PUT to the private profile-photos bucket.
 * Records the object key on the attendee; presign-on-read serves it in the yearbook.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const input = parseBody(profilePhotoSchema, event.body);
    if (!isImageType(input.contentType)) {
      throw new ApiException('VALIDATION', 'Only image uploads are allowed');
    }

    const key = `profiles/${attendeeId}.${extensionFor(input.contentType)}`;
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.attendeeProfile(attendeeId),
        UpdateExpression: 'SET profilePhotoKey = :k, updatedAt = :now',
        ExpressionAttributeValues: { ':k': key, ':now': new Date().toISOString() },
      })
    );

    // The key is recorded, so the "add a photo" registration action is provably done.
    await autoCompleteAction(attendeeId, 'photo');

    const uploadUrl = await presignUploadTo(PROFILE_BUCKET, key, input.contentType);
    const ticket: UploadTicket = { uploadUrl, key };
    return ok(ticket, 201);
  } catch (e) {
    return fail(e);
  }
};
