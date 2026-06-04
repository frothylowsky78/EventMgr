import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, isAdmin, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { GALLERY_BUCKET } from '../lib/s3';

const s3 = new S3Client({});

/**
 * DELETE /events/{eventId}/photos/{photoId} — remove a photo. Allowed for the uploader or an
 * admin. Deletes both the metadata and the S3 object.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const eventId = event.pathParameters?.eventId;
    const photoId = event.pathParameters?.photoId;
    if (!eventId || !photoId) {
      throw new ApiException('VALIDATION', 'eventId and photoId are required');
    }

    const got = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.photo(eventId, photoId) })
    );
    if (!got.Item) throw new ApiException('NOT_FOUND', 'Photo not found');

    const isOwner = got.Item.uploadedByAttendeeId === auth.attendeeId;
    if (!isOwner && !isAdmin(auth)) {
      throw new ApiException('FORBIDDEN', 'You can only delete your own photos');
    }

    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: keys.photo(eventId, photoId) }));
    if (got.Item.key && GALLERY_BUCKET) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: GALLERY_BUCKET, Key: got.Item.key as string }))
        .catch((e) => console.warn('S3 delete skipped', e));
    }

    return ok({ photoId, deleted: true });
  } catch (e) {
    return fail(e);
  }
};
