import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv, splitMulti, parseBool } from './csv.ts';

test('parseCsv handles headers, quoted commas, and embedded quotes', () => {
  const rows = parseCsv(
    'name,note\nJane,"Hello, world"\nJohn,"She said ""hi"""\n'
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Jane');
  assert.equal(rows[0].note, 'Hello, world');
  assert.equal(rows[1].note, 'She said "hi"');
});

test('parseCsv skips blank lines and trims cells', () => {
  const rows = parseCsv('a,b\n 1 , 2 \n\n3,4\n');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { a: '1', b: '2' });
});

test('toCsv escapes fields needing quotes', () => {
  const csv = toCsv(['a', 'b'], [{ a: 'x,y', b: 'plain' }]);
  assert.equal(csv, 'a,b\r\n"x,y",plain');
});

test('splitMulti and parseBool', () => {
  assert.deepEqual(splitMulti('golf; vip ;'), ['golf', 'vip']);
  assert.equal(parseBool('TRUE'), true);
  assert.equal(parseBool('no'), false);
});
