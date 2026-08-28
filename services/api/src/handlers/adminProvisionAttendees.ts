import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { randomBytes } from 'node:crypto';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import type { ProvisionResult } from '@eventmgr/shared-types';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { deriveAttendeeId } from '../lib/attendeeId';
import { audit } from '../lib/audit';

const USER_POOL_ID = process.env.USER_POOL_ID ?? '';

/** Leaves headroom under the Lambda timeout (29s) and API Gateway's hard 30s cap. */
const WORK_BUDGET_MS = 20_000;

const cognito = new CognitoIdentityProviderClient({});

/**
 * Random password satisfying the pool policy (12+ chars, upper/lower/digit/symbol — see
 * infra/lib/constructs/auth.ts). Only exists to clear FORCE_CHANGE_PASSWORD; attendees sign in
 * through the passwordless access-code flow. Never logged, returned, or stored.
 */
const throwawayPassword = (): string => `Aa1!${randomBytes(24).toString('base64url')}`;

/** Every email that already has a Cognito user, so we don't probe one-by-one for 100 people. */
async function existingEmails(): Promise<Set<string>> {
  const found = new Set<string>();
  let token: string | undefined;
  do {
    const res = await cognito.send(
      new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60, PaginationToken: token })
    );
    for (const user of res.Users ?? []) {
      const email = user.Attributes?.find((a) => a.Name === 'email')?.Value;
      if (email) found.add(email.toLowerCase());
    }
    token = res.PaginationToken;
  } while (token);
  return found;
}

/**
 * POST /admin/events/{eventId}/attendees/provision — create Cognito users for imported
 * attendees so they can actually sign in. adminImportAttendees writes the DynamoDB records and
 * hashes the access code but creates no users, so without this step login is impossible.
 *
 * Idempotent: attendees who already have a Cognito user are skipped, so staff can re-run this
 * after adding late arrivals. Time-boxed because ~100 attendees exceed API Gateway's 30s cap —
 * when `remaining > 0` the caller simply invokes it again.
 *
 * The CLI equivalent is services/api/scripts/provision-attendees.ts, kept as a fallback.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const startedAt = Date.now();
  try {
    const auth = getAuth(event);
    requireAdmin(auth);
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');
    if (!USER_POOL_ID) throw new ApiException('VALIDATION', 'USER_POOL_ID is not configured');

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.attendeeList(eventId).GSI1PK },
      })
    );
    const attendees = (res.Items ?? []).filter((i) => i.email);

    const already = await existingEmails();

    let provisioned = 0;
    let skipped = 0;
    let remaining = 0;
    const errors: { email: string; message: string }[] = [];

    for (const item of attendees) {
      const email = String(item.email).toLowerCase();

      if (already.has(email)) {
        skipped++;
        continue;
      }

      // Out of budget — report the rest as remaining so the caller can run again.
      if (Date.now() - startedAt > WORK_BUDGET_MS) {
        remaining++;
        continue;
      }

      // Prefers the id already on the record; falls back to the shared derivation so this can
      // never disagree with what the import handler wrote.
      const attendeeId = deriveAttendeeId(email, item.id as string | undefined);

      try {
        try {
          await cognito.send(
            new AdminCreateUserCommand({
              UserPoolId: USER_POOL_ID,
              Username: email,
              UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'custom:attendeeId', Value: attendeeId },
                { Name: 'custom:eventId', Value: eventId },
              ],
              // Real guests: never send a Cognito invite email.
              MessageAction: 'SUPPRESS',
            })
          );
        } catch (e) {
          // Raced with another run, or ListUsers paged past them. Treat as already done.
          if (e instanceof UsernameExistsException) {
            skipped++;
            continue;
          }
          throw e;
        }

        await cognito.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
            Password: throwawayPassword(),
            Permanent: true,
          })
        );
        provisioned++;
      } catch (e) {
        // One bad row must not abandon the rest.
        errors.push({ email, message: e instanceof Error ? e.message : String(e) });
      }
    }

    await audit(eventId, auth.userId, 'attendees.provision', {
      provisioned,
      skipped,
      remaining,
      errors: errors.length,
    });

    const result: ProvisionResult = { provisioned, skipped, remaining, errors };
    return ok(result);
  } catch (e) {
    return fail(e);
  }
};
