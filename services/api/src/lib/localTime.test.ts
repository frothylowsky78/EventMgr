import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localToIso } from './localTime.ts';

test('localToIso attaches the zone offset in effect on that date', () => {
  assert.equal(localToIso('2026-09-15', '09:00', 'America/Los_Angeles'), '2026-09-15T09:00:00-07:00');
  // Same wall clock in January is standard time, not daylight.
  assert.equal(localToIso('2026-01-15', '09:00', 'America/Los_Angeles'), '2026-01-15T09:00:00-08:00');
});

test('localToIso handles half-hour zones, seconds, and UTC', () => {
  assert.equal(localToIso('2026-09-15', '09:00', 'Asia/Kolkata'), '2026-09-15T09:00:00+05:30');
  assert.equal(localToIso('2026-09-15', '09:00:30', 'UTC'), '2026-09-15T09:00:30+00:00');
});

test('localToIso falls back to UTC for an unknown zone', () => {
  assert.equal(localToIso('2026-09-15', '09:00', 'Not/AZone'), '2026-09-15T09:00:00+00:00');
});
