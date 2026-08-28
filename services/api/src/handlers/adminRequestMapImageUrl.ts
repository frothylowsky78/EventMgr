import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { UploadTicket } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { ASSETS_BUCKET, presignUploadTo, isImageType, extensionFor } from '../lib/s3';
import { mapImageSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/maps/{mapId}/image-url — pre-signed PUT for a map image.
 * The file goes straight to the private assets bucket (never through Lambda); the key is
 * recorded on the map and swapped for a signed GET when maps are listed.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const mapId = event.pathParameters?.mapId;
    if (!eventId || !mapId) {
      throw new ApiException('VALIDATION', 'eventId and mapId are required');
    }

    const input = parseBody(mapImageSchema, event.body);
    if (!isImageType(input.contentType)) {
      throw new ApiException('VALIDATION', 'Only image uploads are allowed');
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.mapLocation(eventId, mapId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Map not found');

    const key = `maps/${eventId}/${mapId}.${extensionFor(input.contentType)}`;
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.mapLocation(eventId, mapId),
        UpdateExpression: 'SET imageKey = :k, updatedAt = :now',
        ExpressionAttributeValues: { ':k': key, ':now': new Date().toISOString() },
      })
    );

    const uploadUrl = await presignUploadTo(ASSETS_BUCKET, key, input.contentType);
    await audit(eventId, auth.userId, 'map.image', { mapId });
    const ticket: UploadTicket = { uploadUrl, key };
    return ok(ticket, 201);
  } catch (e) {
    return fail(e);
  }
};
