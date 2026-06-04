import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toPhoto } from '../lib/mappers';
import { parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

const schema = z.object({
  status: z.enum(['pending', 'approved', 'hidden', 'rejected']).optional(),
  featured: z.boolean().optional(),
  albumId: z.string().nullable().optional(),
});

/**
 * PATCH /admin/events/{eventId}/photos/{photoId} — moderate a photo: approve / hide / reject,
 * feature, or assign an album. Keeps the GSI1 status partition consistent so the gallery and
 * moderation queues stay correct.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const photoId = event.pathParameters?.photoId;
    if (!eventId || !photoId) {
      throw new ApiException('VALIDATION', 'eventId and photoId are required');
    }

    const patch = parseBody(schema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.photo(eventId, photoId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Photo not found');

    const merged: Record<string, any> = { ...existing.Item, updatedAt: new Date().toISOString() };
    if (patch.status !== undefined) {
      merged.status = patch.status;
      merged.GSI1PK = keys.photoByStatus(eventId, patch.status).GSI1PK;
    }
    if (patch.featured !== undefined) merged.featured = patch.featured;
    if (patch.albumId !== undefined) {
      merged.albumId = patch.albumId;
      if (patch.albumId) {
        merged.GSI2PK = keys.photoByAlbum(patch.albumId).GSI2PK;
        merged.GSI2SK = merged.createdAt;
      }
    }

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'photo.moderate', { photoId, status: merged.status });
    return ok(toPhoto(merged));
  } catch (e) {
    return fail(e);
  }
};
