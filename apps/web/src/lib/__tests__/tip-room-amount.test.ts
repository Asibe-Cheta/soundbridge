import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTipRoomAmount, TIP_ROOM_MIN_GBP, TIP_ROOM_MAX_GBP } from '../tip-room-amount';

test('accepts amounts within range with up to 2 decimals', () => {
  assert.deepEqual(validateTipRoomAmount('4'), { ok: true, amount: 4 });
  assert.deepEqual(validateTipRoomAmount('4.5'), { ok: true, amount: 4.5 });
  assert.deepEqual(validateTipRoomAmount('123.45'), { ok: true, amount: 123.45 });
  assert.deepEqual(validateTipRoomAmount(TIP_ROOM_MAX_GBP), { ok: true, amount: TIP_ROOM_MAX_GBP });
  assert.deepEqual(validateTipRoomAmount(TIP_ROOM_MIN_GBP), { ok: true, amount: TIP_ROOM_MIN_GBP });
});

test('rejects below the floor', () => {
  const result = validateTipRoomAmount('3.99');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Minimum tip/);
});

test('rejects above the cap', () => {
  const result = validateTipRoomAmount('500.01');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Maximum tip/);
});

test('rejects non-numeric input', () => {
  for (const bad of ['abc', '4a', '', 'NaN', '--5']) {
    const result = validateTipRoomAmount(bad);
    assert.equal(result.ok, false, `expected "${bad}" to be rejected`);
  }
});

test('rejects negative amounts', () => {
  assert.equal(validateTipRoomAmount('-5').ok, false);
});

test('rejects more than 2 decimal places', () => {
  assert.equal(validateTipRoomAmount('4.001').ok, false);
  assert.equal(validateTipRoomAmount('10.999').ok, false);
});

test('rejects null/undefined/missing', () => {
  assert.equal(validateTipRoomAmount(null).ok, false);
  assert.equal(validateTipRoomAmount(undefined).ok, false);
});

test('accepts a numeric (not string) input the same way', () => {
  assert.deepEqual(validateTipRoomAmount(20), { ok: true, amount: 20 });
});
