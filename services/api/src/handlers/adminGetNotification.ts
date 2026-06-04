import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toNotification } from '../lib/mappers';

/** GET /admin/events/{eventId}/notifications/{notificationId}. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    const notificationId = event.pathParameters?.notificationId;
    if (!eventId || !notificationId) {
      throw new ApiException('VALIDATION', 'eventId and notificationId are required');
    }

    const res = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.notification(eventId, notificationId) })
    );
    if (!res.Item) throw new ApiException('NOT_FOUND', 'Notification not found');
    return ok(toNotification(res.Item));
  } catch (e) {
    return fail(e);
  }
};
