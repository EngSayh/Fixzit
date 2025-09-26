import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCartAmount } from '../../src/lib/payments/parseCartAmount';

test('accepts numeric input', () => {
  assert.equal(parseCartAmount(249.99), 249.99);
  assert.equal(parseCartAmount(0), 0);
});

test('parses decimal strings with dot separators', () => {
  assert.equal(parseCartAmount(' 147.25 '), 147.25);
  assert.equal(parseCartAmount('-42.5'), -42.5);
});

test('parses values with grouping commas', () => {
  assert.equal(parseCartAmount('1,234.56'), 1234.56);
  assert.equal(parseCartAmount('12,345'), 12345);
});

test('parses values with european decimal comma', () => {
  assert.equal(parseCartAmount('1.234,56'), 1234.56);
  assert.equal(parseCartAmount('1234,5'), 1234.5);
});

test('rejects malformed inputs', () => {
  assert.equal(parseCartAmount(''), null);
  assert.equal(parseCartAmount('  '), null);
  assert.equal(parseCartAmount('abc'), null);
  assert.equal(parseCartAmount('12.34.56'), null);
  assert.equal(parseCartAmount('1,2,3'), null);
  assert.equal(parseCartAmount(null), null);
  assert.equal(parseCartAmount(undefined), null);
});

test('rejects non-finite numbers', () => {
  assert.equal(parseCartAmount(Infinity), null);
  assert.equal(parseCartAmount(NaN), null);
});
