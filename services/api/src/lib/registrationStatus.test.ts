import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRegistrationStatus, isRegistrationDone } from './registrationStatus.ts';

const actions = [
  { id: 'confirm_attendance', label: 'Confirm attendance' },
  { id: 'dietary', label: 'Dietary needs' },
  { id: 'flight', label: 'Share flights' },
];

test('computeRegistrationStatus walks none -> some -> all', () => {
  assert.equal(computeRegistrationStatus([], actions), 'not_started');
  assert.equal(computeRegistrationStatus(['dietary'], actions), 'in_progress');
  assert.equal(
    computeRegistrationStatus(['confirm_attendance', 'dietary', 'flight'], actions),
    'complete'
  );
});

test('completed ids the event no longer defines do not count toward completion', () => {
  // An admin can delete an action from the event after guests have ticked it.
  assert.equal(computeRegistrationStatus(['dietary', 'retired_action'], actions), 'in_progress');
});

test('an event with no required actions is trivially complete', () => {
  assert.equal(computeRegistrationStatus([], []), 'complete');
});

test('isRegistrationDone accepts the legacy submitted value', () => {
  assert.ok(isRegistrationDone('complete'));
  assert.ok(isRegistrationDone('submitted'));
  assert.ok(!isRegistrationDone('in_progress'));
  assert.ok(!isRegistrationDone(undefined));
});
