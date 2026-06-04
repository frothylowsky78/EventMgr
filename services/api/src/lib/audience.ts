import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type {
  NotificationTarget,
  NotificationTargetType,
} from '@eventmgr/shared-types';
import { ddb } from './dynamo';
import { TABLE_NAME, keys } from './keys';
import { ApiException } from './http';

export interface ResolvedAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tags: string[];
  registrationStatus: string;
}

export interface ResolvedAudience {
  attendees: ResolvedAttendee[];
  description: string;
}

/** Target types resolvable purely from attendee fields today. The remaining types
 * (activity / transportation / dining) are resolved once those slices land their data. */
const SUPPORTED: NotificationTargetType[] = [
  'all',
  'individuals',
  'tag',
  'incomplete_registration',
];

async function allEventAttendees(eventId: string): Promise<ResolvedAttendee[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': keys.attendeeList(eventId).GSI1PK },
    })
  );
  return (res.Items ?? [])
    .filter((i) => i.enabled !== false)
    .map((i) => ({
      id: i.id,
      firstName: i.firstName ?? '',
      lastName: i.lastName ?? '',
      email: i.email ?? '',
      tags: (i.tags as string[]) ?? [],
      registrationStatus: i.registrationStatus ?? 'not_started',
    }));
}

/** Resolves a target into the concrete list of attendees plus a human description. */
export async function resolveAudience(
  eventId: string,
  target: NotificationTarget
): Promise<ResolvedAudience> {
  if (!SUPPORTED.includes(target.type)) {
    throw new ApiException(
      'VALIDATION',
      `Target type "${target.type}" is not yet supported. ` +
        `Supported now: ${SUPPORTED.join(', ')}.`
    );
  }

  const everyone = await allEventAttendees(eventId);
  const criteria = target.criteria ?? {};

  switch (target.type) {
    case 'all':
      return { attendees: everyone, description: 'All attendees' };

    case 'individuals': {
      const ids = new Set(criteria.attendeeIds ?? []);
      const attendees = everyone.filter((a) => ids.has(a.id));
      return {
        attendees,
        description: `${attendees.length} selected attendee(s)`,
      };
    }

    case 'tag': {
      const tags = criteria.tags ?? [];
      const attendees = everyone.filter((a) => a.tags.some((t) => tags.includes(t)));
      return { attendees, description: `Tags: ${tags.join(', ') || '(none)'}` };
    }

    case 'incomplete_registration': {
      const attendees = everyone.filter((a) => a.registrationStatus !== 'submitted');
      return { attendees, description: 'Attendees with incomplete registration' };
    }

    default:
      // Unreachable due to the SUPPORTED guard above.
      throw new ApiException('VALIDATION', 'Unsupported target');
  }
}
