import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo';
import { ApiException } from './http';
import { TABLE_NAME, keys } from './keys';

/**
 * Resolves a locationId to its display name, so items carry a printable location without the
 * client having to join. Returns null for an empty/absent id; throws if the id doesn't exist,
 * which is what stops locationId from drifting into a dangling reference again.
 */
export async function resolveLocationName(
  eventId: string,
  locationId: string | null | undefined
): Promise<string | null> {
  if (!locationId) return null;
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: keys.location(eventId, locationId) })
  );
  if (!res.Item) throw new ApiException('VALIDATION', `Unknown locationId "${locationId}"`);
  return (res.Item.name as string) ?? null;
}
