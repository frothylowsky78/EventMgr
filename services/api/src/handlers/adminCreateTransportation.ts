import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { toTransportationItem } from '../lib/mappers';
import { transportationCreateSchema, parseBody } from '../lib/validation';
import { newId } from '../lib/id';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/transportation — assign a transportation item to an attendee.
 * Stored under the attendee; a GSI1 partition indexes the shuttle group so push notifications
 * can target a whole transportation group.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const input = parseBody(transportationCreateSchema, event.body);
    const id = newId('transport');
    const now = new Date().toISOString();
    const group = input.group ?? 'unassigned';

    const item = {
      ...keys.transportation(input.attendeeId, id),
      GSI1PK: keys.transportationByGroup(eventId, group).GSI1PK,
      GSI1SK: `${input.pickupDateTime ?? ''}#${input.attendeeId}`,
      entity: 'TransportationItem',
      id,
      eventId,
      attendeeId: input.attendeeId,
      transferType: input.transferType,
      group,
      pickupDateTime: input.pickupDateTime,
      pickupLocation: input.pickupLocation,
      dropoffLocation: input.dropoffLocation,
      vendor: input.vendor,
      contactPhone: input.contactPhone,
      vehicleDescription: input.vehicleDescription,
      notes: input.notes,
      mapLink: input.mapLink,
      status: input.status ?? 'scheduled',
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await audit(eventId, auth.userId, 'transportation.create', {
      attendeeId: input.attendeeId,
      transportId: id,
    });
    return ok(toTransportationItem(item), 201);
  } catch (e) {
    return fail(e);
  }
};
