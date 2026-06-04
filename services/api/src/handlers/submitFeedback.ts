import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toFeedback } from '../lib/mappers';
import { feedbackCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';

/**
 * POST /events/{eventId}/feedback
 * One submission per attendee per target (keyed by targetId) — re-submitting overwrites.
 * Stored under the attendee; a GSI1 partition aggregates a target's feedback for admin export.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(feedbackCreateSchema, event.body);
    const now = new Date().toISOString();
    const id = newId('fb');

    const item = {
      ...keys.feedback(attendeeId, input.targetId),
      GSI1PK: keys.feedbackByTarget(eventId, input.targetId).GSI1PK,
      GSI1SK: `${now}#${attendeeId}`,
      entity: 'Feedback',
      id,
      eventId,
      attendeeId,
      type: input.type,
      targetId: input.targetId,
      rating: input.rating,
      comments: input.comments ?? '',
      wouldRecommend: input.wouldRecommend,
      issueFlag: input.issueFlag ?? false,
      anonymous: input.anonymous ?? false,
      createdAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return ok(toFeedback(item), 201);
  } catch (e) {
    return fail(e);
  }
};
