import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';

/** DELETE /me/device-tokens/{id} — unregister a device (e.g. on sign-out). */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const id = event.pathParameters?.id;
    if (!id) throw new ApiException('VALIDATION', 'token id is required');

    await ddb.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: keys.deviceToken(attendeeId, id) })
    );
    return ok({ id, deleted: true });
  } catch (e) {
    return fail(e);
  }
};
