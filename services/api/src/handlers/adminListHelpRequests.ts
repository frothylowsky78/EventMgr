import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { HelpRequestStatus } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toHelpRequest } from '../lib/mappers';

const STATUSES: HelpRequestStatus[] = ['open', 'assigned', 'resolved'];

/** GET /admin/events/{eventId}/help-requests?status=open — staff triage queue. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const status = (event.queryStringParameters?.status as HelpRequestStatus) ?? 'open';
    if (!STATUSES.includes(status)) throw new ApiException('VALIDATION', 'Invalid status');

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.helpRequestByStatus(eventId, status).GSI1PK },
        ScanIndexForward: false,
      })
    );
    return ok((res.Items ?? []).map(toHelpRequest));
  } catch (e) {
    return fail(e);
  }
};
