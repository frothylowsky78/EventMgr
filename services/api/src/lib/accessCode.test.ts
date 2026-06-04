import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashAccessCode, accessCodeMatches } from './accessCode.ts';

test('hash is deterministic and case/space-insensitive on the code', () => {
  const a = hashAccessCode('Jane@Example.com', 'vip2026');
  const b = hashAccessCode('jane@example.com', '  VIP2026 ');
  assert.equal(a, b);
});

test('accessCodeMatches accepts the right code and rejects wrong ones', () => {
  const email = 'jane@example.com';
  const hash = hashAccessCode(email, 'VIP2026');
  assert.ok(accessCodeMatches(email, 'vip2026', hash));
  assert.ok(!accessCodeMatches(email, 'WRONG', hash));
  assert.ok(!accessCodeMatches('other@example.com', 'VIP2026', hash));
});

test('empty expected hash never matches', () => {
  assert.ok(!accessCodeMatches('jane@example.com', 'anything', ''));
});
