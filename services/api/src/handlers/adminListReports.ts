import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { ModerationReport } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, eventPk, keys } from '../lib/keys';
import { toModerationReport } from '../lib/mappers';

/**
 * GET /admin/events/{eventId}/reports?targetType=photo|message — the staff moderation feed,
 * newest first. Reads the mirror rows written by lib/reports.ts, so one query covers both
 * reported photos and reported messages.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const targetType = event.queryStringParameters?.targetType;
    if (targetType && targetType !== 'photo' && targetType !== 'message') {
      throw new ApiException('VALIDATION', 'targetType must be photo or message');
    }

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': eventPk(eventId), ':sk': keys.reportPrefix },
        ScanIndexForward: false, // newest first
      })
    );

    const reports: ModerationReport[] = (res.Items ?? [])
      .map(toModerationReport)
      .filter((r) => !targetType || r.targetType === targetType);

    return ok(reports);
  } catch (e) {
    return fail(e);
  }
};
