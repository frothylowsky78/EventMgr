import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toFaqItem } from '../lib/mappers';
import { faqUpdateSchema, parseBody } from '../lib/validation';
import { audit } from '../lib/audit';

/** PATCH /admin/events/{eventId}/faq/{faqId} — partial update. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    const faqId = event.pathParameters?.faqId;
    if (!eventId || !faqId) {
      throw new ApiException('VALIDATION', 'eventId and faqId are required');
    }

    const patch = parseBody(faqUpdateSchema, event.body);
    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: keys.faqItem(eventId, faqId) })
    );
    if (!existing.Item) throw new ApiException('NOT_FOUND', 'FAQ item not found');

    const merged: Record<string, any> = {
      ...existing.Item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    merged.GSI1SK = keys.faqGsi1Sk(merged.category, merged.order ?? 0);

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: merged }));
    await audit(eventId, auth.userId, 'faq.update', { faqId });
    return ok(toFaqItem(merged));
  } catch (e) {
    return fail(e);
  }
};
