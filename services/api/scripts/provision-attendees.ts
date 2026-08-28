/**
 * Provisions Cognito users for attendees imported via the admin CSV import.
 *
 * adminImportAttendees writes the DynamoDB records and hashes the access code, but does not
 * create Cognito users — so imported attendees cannot sign in at all. This script closes that
 * gap for the ~100 real attendees.
 *
 * Attendees authenticate with the passwordless custom-auth (email + access code) flow. The
 * password set here exists only to clear FORCE_CHANGE_PASSWORD so the account is usable; it is
 * random, never reused, never logged, and never persisted.
 *
 * Idempotent: re-running is safe and is the expected way to add late attendees. Existing users
 * have their attributes refreshed rather than being treated as an error.
 *
 * Usage:
 *   USER_POOL_ID=... AWS_REGION=... EVENT_ID=... npx tsx scripts/provision-attendees.ts <csv>
 *
 * Run with `npx tsx` — the repo's imports are extensionless and Node's ESM resolver rejects
 * them under --experimental-strip-types.
 */
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { parseCsv } from '../src/lib/csv';
import { deriveAttendeeId } from '../src/lib/attendeeId';

type Outcome = 'created' | 'existed' | 'failed' | 'skipped';

interface RowResult {
  row: number;
  email: string;
  outcome: Outcome;
  detail?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(2);
  }
  return value;
}

/**
 * Random password meeting the pool policy (12+ chars, upper/lower/digit/symbol — see
 * infra/lib/constructs/auth.ts). Never returned to the caller, logged, or stored.
 */
function throwawayPassword(): string {
  return `Aa1!${randomBytes(24).toString('base64url')}`;
}

async function main(): Promise<void> {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/provision-attendees.ts <attendees.csv>');
    process.exit(2);
  }

  const userPoolId = requireEnv('USER_POOL_ID');
  const region = requireEnv('AWS_REGION');
  const eventId = requireEnv('EVENT_ID');

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  if (rows.length === 0) {
    console.error(`No data rows in ${csvPath}`);
    process.exit(2);
  }

  const cognito = new CognitoIdentityProviderClient({ region });
  const results: RowResult[] = [];

  console.log(`Provisioning ${rows.length} attendee(s) into ${userPoolId} (${region})`);
  console.log(`Event: ${eventId}\n`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2; // 1-based, plus the header line
    const email = (r.email ?? '').toLowerCase();

    // Same required-field check the import handler applies, so the two agree on what a row is.
    if (!email || !r.firstName || !r.lastName) {
      results.push({
        row: rowNumber,
        email: email || '(no email)',
        outcome: 'skipped',
        detail: 'email, firstName and lastName are required',
      });
      console.log(`  [${rowNumber}] ${email || '(no email)'} — SKIPPED: missing required fields`);
      continue;
    }

    const attendeeId = deriveAttendeeId(email, r.id);
    const attributes = [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'custom:attendeeId', Value: attendeeId },
      { Name: 'custom:eventId', Value: eventId },
    ];

    let outcome: Outcome = 'created';
    try {
      try {
        await cognito.send(
          new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: attributes,
            // These are real guests: never send a Cognito invite email.
            MessageAction: 'SUPPRESS',
          })
        );
      } catch (e) {
        if (!(e instanceof UsernameExistsException)) throw e;
        // Already provisioned — refresh attributes so a changed id/event doesn't go stale.
        outcome = 'existed';
        await cognito.send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: attributes,
          })
        );
      }

      // Clears FORCE_CHANGE_PASSWORD. The value is discarded immediately.
      await cognito.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: email,
          Password: throwawayPassword(),
          Permanent: true,
        })
      );

      results.push({ row: rowNumber, email, outcome });
      console.log(
        `  [${rowNumber}] ${email} — ${outcome === 'created' ? 'CREATED' : 'ALREADY EXISTED'} (${attendeeId})`
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      results.push({ row: rowNumber, email, outcome: 'failed', detail });
      // One bad row must not abandon the other 99.
      console.log(`  [${rowNumber}] ${email} — FAILED: ${detail}`);
    }
  }

  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const failed = count('failed');

  console.log('\nSummary');
  console.log(`  created:  ${count('created')}`);
  console.log(`  existed:  ${count('existed')}`);
  console.log(`  skipped:  ${count('skipped')}`);
  console.log(`  failed:   ${failed}`);
  console.log(`  total:    ${results.length}`);

  if (failed > 0) {
    console.error('\nSome rows failed. Fix them and re-run — the script is idempotent.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
