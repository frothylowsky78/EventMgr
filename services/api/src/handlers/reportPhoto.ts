import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { appendReport } from '../lib/reports';
import { contentReportSchema, parseBody } from '../lib/validation';

/**
 * POST /events/{eventId}/photos/{photoId}/report — flag a gallery photo for staff review
 * (App Store guideline 1.2). Idempotent per reporter: reporting twice is a no-op.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const eventId = event.pathParameters?.eventId;
    const photoId = event.pathParameters?.photoId;
    if (!eventId || !photoId) {
      throw new ApiException('VALIDATION', 'eventId and photoId are required');
    }

    const input = parseBody(contentReportSchema, event.body);
    const got = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.photo(eventId, photoId) })
    );
    if (!got.Item) throw new ApiException('NOT_FOUND', 'Photo not found');

    const { reportCount, alreadyReported } = await appendReport({
      key: keys.photo(eventId, photoId),
      item: got.Item,
      eventId,
      targetType: 'photo',
      targetId: photoId,
      reportedBy: attendeeId,
      reason: input.reason,
      note: input.note,
      summary: (got.Item.caption as string) ?? '',
    });

    return ok({ photoId, reported: true, reportCount, alreadyReported });
  } catch (e) {
    return fail(e);
  }
};
