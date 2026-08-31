import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventIdWith } from './eventScope.ts';
import type { AuthContext } from '@eventmgr/shared-types';

const auth = (over: Partial<AuthContext> = {}): AuthContext => ({
  userId: 'u1',
  roles: [],
  ...over,
});

const never: () => Promise<never> = () => {
  throw new Error('profile should not have been loaded');
};

test('the claim wins and costs no profile read', async () => {
  const got = await resolveEventIdWith(auth({ eventId: 'event_001', attendeeId: 'a1' }), never);
  assert.equal(got, 'event_001');
});

test('falls back to the attendee record when the claim is missing', async () => {
  // This is the demo user: provisioned without custom:eventId.
  const got = await resolveEventIdWith(auth({ attendeeId: 'a1' }), async (id) => {
    assert.equal(id, 'a1');
    return { eventId: 'event_001' };
  });
  assert.equal(got, 'event_001');
});

test('undefined when there is no claim and no attendee behind the token', async () => {
  assert.equal(await resolveEventIdWith(auth(), never), undefined);
});

test('undefined when the profile is missing or carries no eventId', async () => {
  assert.equal(await resolveEventIdWith(auth({ attendeeId: 'a1' }), async () => undefined), undefined);
  assert.equal(await resolveEventIdWith(auth({ attendeeId: 'a1' }), async () => ({})), undefined);
  // An empty string is as unusable as an absent one.
  assert.equal(
    await resolveEventIdWith(auth({ attendeeId: 'a1' }), async () => ({ eventId: '' })),
    undefined
  );
});
