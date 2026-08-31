import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { PersonalDiningItem } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, ok, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, eventPk, keys } from '../lib/keys';
import { toDiningItem, toDiningSeat } from '../lib/mappers';
import { resolveEventId } from '../lib/eventId';

/**
 * GET /me/dining — published dining items with the caller's personal seating merged in.
 * eventId comes from the JWT when present, else the attendee record; seating is private.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);
    const eventId = await resolveEventId(auth);

    const [diningRes, seatRes] = await Promise.all([
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': eventPk(eventId), ':sk': 'DINING#' },
        })
      ),
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': attendeePk(attendeeId),
            ':sk': keys.diningSeatPrefix,
          },
        })
      ),
    ]);

    const seats = new Map(
      (seatRes.Items ?? []).map((s) => [s.diningId as string, toDiningSeat(s)])
    );

    const items: PersonalDiningItem[] = (diningRes.Items ?? [])
      .map(toDiningItem)
      .filter((d) => d.published)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .map((d) => ({ ...d, seating: seats.get(d.id) ?? null }));

    return ok(items);
  } catch (e) {
    return fail(e);
  }
};
