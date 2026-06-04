import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Access codes are never stored in plaintext. We store a salted SHA-256 hash on the attendee
 * record. The salt is the lowercased email, which ties a code to a specific attendee and avoids
 * cross-account code reuse. (For higher security this can be swapped for scrypt/argon2.)
 */
export function hashAccessCode(email: string, code: string): string {
  const normalized = code.trim().toUpperCase();
  return createHash('sha256')
    .update(`${email.trim().toLowerCase()}::${normalized}`)
    .digest('hex');
}

export function accessCodeMatches(email: string, code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashAccessCode(email, code));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
