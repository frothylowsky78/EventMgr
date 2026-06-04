import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, getRawBody, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { parseCsv, splitMulti, parseBool } from '../lib/csv';
import { hashAccessCode } from '../lib/accessCode';
import { audit } from '../lib/audit';

/**
 * POST /admin/events/{eventId}/attendees/import — bulk upsert attendees from CSV.
 * Body is the raw CSV (text/csv) matching tools/import-templates/attendees.csv.
 * Email is the natural key; re-importing the same email updates that attendee.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const rows = parseCsv(getRawBody(event));
    if (rows.length === 0) throw new ApiException('VALIDATION', 'CSV has no data rows');

    let imported = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const email = (r.email ?? '').toLowerCase();
      if (!email || !r.firstName || !r.lastName) {
        errors.push({ row: i + 2, message: 'email, firstName, lastName are required' });
        continue;
      }
      // Deterministic id from email so re-imports update rather than duplicate.
      const attendeeId =
        r.id?.trim() || `attendee_${Buffer.from(email).toString('hex').slice(0, 16)}`;

      const item: Record<string, unknown> = {
        ...keys.attendeeProfile(attendeeId),
        ...keys.attendeeList(eventId),
        GSI1SK: `${r.lastName}#${r.firstName}`,
        GSI2PK: keys.attendeeByEmail(email).GSI2PK,
        GSI2SK: 'ATTENDEE',
        entity: 'Attendee',
        id: attendeeId,
        eventId,
        firstName: r.firstName,
        lastName: r.lastName,
        email,
        phone: r.phone ?? '',
        company: r.company ?? '',
        title: r.title ?? '',
        city: r.city ?? '',
        dietaryRestrictions: splitMulti(r.dietaryRestrictions ?? ''),
        accessibilityNeeds: r.accessibilityNeeds ?? '',
        guestName: r.guestName ?? '',
        tags: splitMulti(r.tags ?? ''),
        directoryVisible: r.directoryVisible ? parseBool(r.directoryVisible) : true,
        contactSharingOptIn: parseBool(r.contactSharingOptIn ?? ''),
        registrationStatus: r.registrationStatus || 'not_started',
        completedRegistrationActions: [],
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
      if (r.accessCode) item.accessCodeHash = hashAccessCode(email, r.accessCode);

      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      imported++;
    }

    await audit(eventId, auth.userId, 'attendees.import', { imported, errors: errors.length });
    return ok({ imported, errors });
  } catch (e) {
    return fail(e);
  }
};
