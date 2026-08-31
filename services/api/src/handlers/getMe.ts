import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toAttendee } from '../lib/mappers';
import { presignProfileIfKey } from '../lib/s3';

/** GET /me — full private profile of the authenticated attendee. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);

    const res = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.attendeeProfile(attendeeId) })
    );
    if (!res.Item) throw new ApiException('NOT_FOUND', 'Attendee profile not found');
    if (res.Item.enabled === false) {
      throw new ApiException('FORBIDDEN', 'Account disabled');
    }

    // Profile photos live in a private bucket; only the key is stored, so sign it on read.
    return ok({
      ...toAttendee(res.Item),
      profilePhotoUrl: await presignProfileIfKey(
        res.Item.profilePhotoKey,
        res.Item.profilePhotoUrl
      ),
    });
  } catch (e) {
    return fail(e);
  }
};
