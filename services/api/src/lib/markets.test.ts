import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferMarkets, resolveMarkets } from './markets.ts';

test('the seed attendees land in a real market instead of Other', () => {
  assert.deepEqual(inferMarkets({ city: 'Seattle, WA' }), ['Seattle']);
  assert.deepEqual(inferMarkets({ city: 'San Francisco, CA' }), ['Bay Area']);
});

test('an explicit market tag overrides inference', () => {
  // City says Seattle, the admin says Boston. The admin wins.
  assert.deepEqual(
    resolveMarkets({ city: 'Seattle, WA', tags: ['Boston'] }),
    ['Boston']
  );
  // Operational tags are not market tags, so inference still runs.
  assert.deepEqual(
    resolveMarkets({ city: 'Seattle, WA', tags: ['golf', 'vip'] }),
    ['Seattle']
  );
});

test('Cambridge is Boston, Cambridge UK is not', () => {
  assert.deepEqual(inferMarkets({ city: 'Cambridge' }), ['Boston']);
  assert.deepEqual(inferMarkets({ city: 'Cambridge, MA' }), ['Boston']);
  assert.deepEqual(inferMarkets({ city: 'Cambridge, UK' }), ['UK']);
  assert.deepEqual(inferMarkets({ city: 'Cambridge UK' }), ['UK']);
  assert.deepEqual(inferMarkets({ city: 'London' }), ['UK']);
  assert.deepEqual(inferMarkets({ city: 'London, England' }), ['UK']);
});

test('company and city both contribute', () => {
  assert.deepEqual(
    inferMarkets({ city: 'Boston, MA', company: 'Blackstone Inc.' }),
    ['Boston', 'Blackstone']
  );
  assert.deepEqual(
    inferMarkets({ company: 'BioMed Realty Trust' }),
    ['BioMed Realty']
  );
});

test('an unmatched city infers nothing, leaving the attendee in Other', () => {
  assert.deepEqual(inferMarkets({ city: 'Reykjavik' }), []);
  assert.deepEqual(inferMarkets({}), []);
  assert.deepEqual(resolveMarkets({ city: 'Reykjavik', tags: ['golf'] }), []);
});

test('a city that merely contains "uk" is not the United Kingdom', () => {
  assert.deepEqual(inferMarkets({ city: 'Milwaukee, WI' }), []);
});
