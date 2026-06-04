import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import type { PhotoUploadTicket } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { presignUpload, isImageType, extensionFor } from '../lib/s3';
import { parseBody } from '../lib/validation';
import { newId } from '../lib/id';

const schema = z.object({
  contentType: z.string().min(1),
  caption: z.string().max(500).optional(),
  albumId: z.string().optional(),
});

/**
 * POST /events/{eventId}/photos/upload-url
 * Verifies the attendee, restricts to image types, creates the metadata record in its
 * moderation-pending state, and returns a pre-signed S3 PUT URL. The app uploads directly to S3;
 * an S3 event then finalizes processing.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(schema, event.body);
    if (!isImageType(input.contentType)) {
      throw new ApiException('VALIDATION', 'Only image uploads are allowed');
    }

    // Moderation default comes from the event profile (defaults to enabled = pending).
    const ev = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.eventProfile(eventId) })
    );
    const moderationEnabled = ev.Item?.photoModerationEnabled ?? true;
    const status = moderationEnabled ? 'pending' : 'approved';

    const photoId = newId('photo');
    const key = `events/${eventId}/gallery/${photoId}.${extensionFor(input.contentType)}`;
    const now = new Date().toISOString();

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...keys.photo(eventId, photoId),
          GSI1PK: keys.photoByStatus(eventId, status).GSI1PK,
          GSI1SK: now,
          ...(input.albumId
            ? { GSI2PK: keys.photoByAlbum(input.albumId).GSI2PK, GSI2SK: now }
            : {}),
          entity: 'Photo',
          id: photoId,
          eventId,
          uploadedByAttendeeId: attendeeId,
          albumId: input.albumId ?? null,
          caption: input.caption ?? '',
          status,
          featured: false,
          likeCount: 0,
          contentType: input.contentType,
          key,
          thumbnailKey: key, // replaced by the processor once thumbnailing is enabled
          uploaded: false,
          createdAt: now,
        },
      })
    );

    const uploadUrl = await presignUpload(key, input.contentType);
    const ticket: PhotoUploadTicket = { photoId, uploadUrl, status };
    return ok(ticket, 201);
  } catch (e) {
    return fail(e);
  }
};
