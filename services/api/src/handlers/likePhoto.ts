import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';

/** POST /events/{eventId}/photos/{photoId}/like — increment the like counter. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAttendee(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    const photoId = event.pathParameters?.photoId;
    if (!eventId || !photoId) {
      throw new ApiException('VALIDATION', 'eventId and photoId are required');
    }

    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.photo(eventId, photoId),
        UpdateExpression: 'SET likeCount = if_not_exists(likeCount, :zero) + :one',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
        ReturnValues: 'UPDATED_NEW',
      })
    ).catch(() => {
      throw new ApiException('NOT_FOUND', 'Photo not found');
    });

    return ok({ photoId, likeCount: res.Attributes?.likeCount ?? 0 });
  } catch (e) {
    return fail(e);
  }
};
