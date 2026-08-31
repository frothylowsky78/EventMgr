import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Photo } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { loadBlockedIds } from '../lib/blocks';
import { TABLE_NAME, keys } from '../lib/keys';
import { toPhoto } from '../lib/mappers';
import { presignDownload } from '../lib/s3';

/**
 * GET /events/{eventId}/photos — approved gallery photos with pre-signed image + thumbnail URLs.
 * Private photos are never public; URLs are short-lived and only issued to authenticated users.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const blocked = new Set(await loadBlockedIds(auth.attendeeId));

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.photoByStatus(eventId, 'approved').GSI1PK },
        ScanIndexForward: false, // newest first
      })
    );

    const photos: Photo[] = await Promise.all(
      (res.Items ?? [])
        .filter((i) => i.uploaded === true)
        // Blocking hides the blocked attendee's content from the blocker (guideline 1.2).
        .filter((i) => !blocked.has(i.uploadedByAttendeeId as string))
        .map(async (i) => ({
          ...toPhoto(i),
          imageUrl: await presignDownload(i.key as string),
          thumbnailUrl: await presignDownload((i.thumbnailKey ?? i.key) as string),
        }))
    );

    return ok(photos);
  } catch (e) {
    return fail(e);
  }
};
