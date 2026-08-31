import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Photo, PhotoStatus } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toPhoto } from '../lib/mappers';
import { presignDownload } from '../lib/s3';

const STATUSES: PhotoStatus[] = ['pending', 'approved', 'hidden', 'rejected'];

/** GET /admin/events/{eventId}/photos?status=pending — moderation queue (defaults to pending). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    // ?reported=true spans every status: a reported photo may already be approved, and staff
    // need to see it wherever it sits (App Store guideline 1.2).
    const reportedOnly = event.queryStringParameters?.reported === 'true';
    const status = (event.queryStringParameters?.status as PhotoStatus) ?? 'pending';
    if (!reportedOnly && !STATUSES.includes(status)) {
      throw new ApiException('VALIDATION', 'Invalid status');
    }

    const queryStatus = (s: PhotoStatus) =>
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': keys.photoByStatus(eventId, s).GSI1PK },
          ScanIndexForward: false,
        })
      );

    const results = reportedOnly
      ? await Promise.all(STATUSES.map(queryStatus))
      : [await queryStatus(status)];
    const items = results
      .flatMap((r) => r.Items ?? [])
      .filter((i) => !reportedOnly || i.reported === true);

    const photos: Photo[] = await Promise.all(
      items.map(async (i) => ({
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
