import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo';
import { TABLE_NAME, keys } from './keys';
import { newId } from './id';

/** Writes an admin audit-log entry (spec §18.10 "Admin actions are traceable"). */
export async function audit(
  eventId: string,
  actorId: string,
  action: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  const ts = new Date().toISOString();
  const id = newId('audit');
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.audit(eventId, ts, id),
        GSI1PK: `EVENT#${eventId}#AUDIT`,
        GSI1SK: ts,
        entity: 'Audit',
        id,
        eventId,
        actorId,
        action,
        detail,
        createdAt: ts,
      },
    })
  );
}
