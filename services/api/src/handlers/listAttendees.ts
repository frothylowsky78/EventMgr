import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendeeCard } from '../lib/mappers';
import { presignProfileIfKey } from '../lib/s3';
import { loadBlockedIds } from '../lib/blocks';

/**
 * GET /events/{eventId}/attendees — yearbook directory.
 * Privacy: only attendees who opted into directory visibility are returned, and only the
 * public card projection (no email/phone/dietary/accessibility). Sorted by last name via GSI1.
 *
 * `?includeBlocked=true` keeps the caller's blocked attendees in the response. It exists for one
 * screen — the unblock list, which needs names for ids it already holds — and lifts only the
 * block filter. Directory-visibility and enabled still apply, so this cannot surface anyone the
 * caller could not otherwise see.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAttendee(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const includeBlocked = event.queryStringParameters?.includeBlocked === 'true';
    const blocked = new Set(await loadBlockedIds(auth.attendeeId));

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.attendeeList(eventId).GSI1PK },
      })
    );

    // Presigning is local crypto (no network call), so signing each card is cheap.
    const cards = await Promise.all(
      (res.Items ?? [])
        .filter((a) => a.directoryVisible !== false && a.enabled !== false)
        .filter((a) => includeBlocked || !blocked.has(a.id as string))
        .map(async (a) => ({
          ...toAttendeeCard(a),
          profilePhotoUrl: await presignProfileIfKey(a.profilePhotoKey, a.profilePhotoUrl),
        }))
    );

    return ok(cards);
  } catch (e) {
    return fail(e);
  }
};
