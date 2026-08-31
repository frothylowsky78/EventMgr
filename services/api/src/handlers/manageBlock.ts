import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { BlockList } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { blockedIdsOf } from '../lib/blocks';

/**
 * POST /me/blocks/{attendeeId} and DELETE /me/blocks/{attendeeId} — the caller's own block list
 * (App Store guideline 1.2).
 *
 * One handler for both methods: they are the same read-modify-write on the same attribute, and
 * a shared Lambda keeps the parent stack's resource count down (see the 500-resource note in
 * infra/lib/constructs/admin-api.ts). Both are idempotent.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const targetId = event.pathParameters?.attendeeId;
    if (!targetId) throw new ApiException('VALIDATION', 'attendeeId is required');
    if (targetId === attendeeId) throw new ApiException('VALIDATION', 'You cannot block yourself');

    const blocking = event.requestContext.http.method.toUpperCase() === 'POST';

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'Attendee profile not found');

    const current = blockedIdsOf(existing.Item);
    const next = blocking
      ? [...new Set([...current, targetId])]
      : current.filter((id) => id !== targetId);

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.attendeeProfile(attendeeId),
        UpdateExpression: 'SET blockedAttendeeIds = :ids, updatedAt = :now',
        ExpressionAttributeValues: { ':ids': next, ':now': new Date().toISOString() },
      })
    );

    const result: BlockList = { blockedAttendeeIds: next };
    return ok(result);
  } catch (e) {
    return fail(e);
  }
};
