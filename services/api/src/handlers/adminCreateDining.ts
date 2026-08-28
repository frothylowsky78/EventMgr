import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toDiningItem } from '../lib/mappers';
import { diningCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';
import { resolveLocationName } from '../lib/locations';

/** POST /admin/events/{eventId}/dining — create a dining item. */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(diningCreateSchema, event.body);
    const id = newId('dining');
    const now = new Date().toISOString();

    const locationName = await resolveLocationName(eventId, input.locationId);

    const item = {
      ...keys.diningItem(eventId, id),
      GSI1PK: keys.diningList(eventId).GSI1PK,
      GSI1SK: keys.diningGsi1Sk(input.date, input.startTime, id),
      entity: 'DiningItem',
      id,
      eventId,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      locationId: input.locationId ?? null,
      locationName,
      description: input.description ?? '',
      menu: input.menu ?? [],
      dressCode: input.dressCode ?? '',
      dietaryNotes: input.dietaryNotes ?? '',
      seatingAssignmentEnabled: input.seatingAssignmentEnabled ?? false,
      mapLink: input.mapLink ?? '',
      published: input.published ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'dining.create', { diningId: id });
    return ok(toDiningItem(item), 201);
  } catch (e) {
    return fail(e);
  }
};
