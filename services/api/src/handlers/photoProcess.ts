import type { S3Event } from 'aws-lambda';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { TABLE_NAME } from '../lib/keys';

/**
 * S3 ObjectCreated trigger for the gallery bucket. Marks the photo record as uploaded so it
 * becomes visible (once approved). The key encodes the photoId: events/{eventId}/gallery/{photoId}.{ext}
 *
 * Thumbnail generation hook: production should resize here (e.g. `sharp`, a Lambda layer, or an
 * S3 Object Lambda) and write a separate thumbnail object, then set `thumbnailKey`. Until then the
 * original key is used as the thumbnail, and the gallery still lazy-loads via pre-signed URLs.
 * Optional Rekognition moderation can run here to auto-reject inappropriate content.
 */
export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const match = key.match(/^events\/([^/]+)\/gallery\/([^.]+)\./);
    if (!match) {
      console.warn('photoProcess: unrecognized key', key);
      continue;
    }
    const [, eventId, photoId] = match;

    // Look up the metadata row (created at upload-url time) by the event + photo id.
    const found = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${eventId}`,
          ':sk': `PHOTO#${photoId}`,
        },
      })
    );
    if (!found.Items?.length) {
      console.warn('photoProcess: no metadata for', { eventId, photoId });
      continue;
    }

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `EVENT#${eventId}`, SK: `PHOTO#${photoId}` },
        UpdateExpression: 'SET uploaded = :true, processedAt = :now',
        ExpressionAttributeValues: { ':true': true, ':now': new Date().toISOString() },
      })
    );
    console.log('photoProcess: finalized', { eventId, photoId });
  }
};
