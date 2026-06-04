import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { fail, getAuth, requireAttendee } from '../lib/http';
import { TABLE_NAME, attendeePk, keys } from '../lib/keys';
import { toItineraryItem } from '../lib/mappers';
import { buildIcs, type IcsEvent } from '../lib/ics';

/**
 * GET /me/itinerary.ics — the caller's full personal itinerary as a downloadable .ics file
 * (Apple/Google/Outlook compatible). Times are emitted in UTC from the stored offsets.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const attendeeId = requireAttendee(auth);

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': attendeePk(attendeeId),
          ':sk': keys.itineraryPrefix,
        },
      })
    );

    const events: IcsEvent[] = (res.Items ?? []).map(toItineraryItem).map((it) => ({
      uid: `${it.id}@eventmgr`,
      start: it.startDateTime,
      end: it.endDateTime ?? undefined,
      summary: it.customTitle ?? 'Itinerary item',
      description: it.notes ?? undefined,
    }));

    const ics = buildIcs('My Itinerary', events);
    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="itinerary.ics"',
      },
      body: ics,
    };
  } catch (e) {
    return fail(e);
  }
};
