import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { ddb } from '../lib/dynamo';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendee } from '../lib/mappers';
import { presignProfileIfKey } from '../lib/s3';
import { setActionComplete } from '../lib/registration';

/**
 * POST and DELETE /me/registration/actions/{actionId}/complete — the attendee ticks a
 * registration item off, or un-ticks it (spec §4.3).
 *
 * One handler for both methods: same read-modify-write on the same attribute, and a second
 * Lambda would cost ~6 more resources against the stack's 500 limit.
 *
 * Returns the full attendee, identical in shape to GET /me, so the client can replace its
 * cached profile instead of patching it.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const actionId = event.pathParameters?.actionId;
    if (!actionId) throw new ApiException('VALIDATION', 'actionId is required');

    const add = event.requestContext.http.method.toUpperCase() === 'POST';
    const updated = await setActionComplete(attendeeId, actionId, add);
    // setActionComplete is strict here, so it either threw or gave us the attendee back.
    const item =
      updated ??
      (
        await ddb.send(
          new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
        )
      ).Item!;

    return ok({
      ...toAttendee(item),
      profilePhotoUrl: await presignProfileIfKey(item.profilePhotoKey, item.profilePhotoUrl),
    });
  } catch (e) {
    return fail(e);
  }
};
