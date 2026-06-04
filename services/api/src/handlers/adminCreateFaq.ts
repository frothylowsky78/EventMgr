import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toFaqItem } from '../lib/mappers';
import { faqCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/** POST /admin/events/{eventId}/faq — create a FAQ item. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(faqCreateSchema, event.body);
    const id = newId('faq');
    const order = input.order ?? 0;
    const now = new Date().toISOString();

    const item = {
      ...keys.faqItem(eventId, id),
      GSI1PK: keys.faqList(eventId).GSI1PK,
      GSI1SK: keys.faqGsi1Sk(input.category, order),
      entity: 'FaqItem',
      id,
      eventId,
      category: input.category,
      question: input.question,
      answer: input.answer,
      featured: input.featured ?? false,
      order,
      published: input.published ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'faq.create', { faqId: id });
    return ok(toFaqItem(item), 201);
  } catch (e) {
    return fail(e);
  }
};
