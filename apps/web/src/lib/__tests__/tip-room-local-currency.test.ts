import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatApproxLocalAmount } from '../tip-room-local-currency';

test('rounds to 2 decimals for small converted amounts', () => {
  // £5 at an EUR factor of ~1.15 -> ~5.75, well under the 100 threshold
  const label = formatApproxLocalAmount(5, 'EUR', 1.15);
  assert.match(label, /5[.,]75/);
});

test('rounds to whole units once the converted amount is large (e.g. NGN)', () => {
  // £5 at a plausible GBP->NGN factor -> well over 100
  const label = formatApproxLocalAmount(5, 'NGN', 1900);
  assert.doesNotMatch(label, /\.\d{2}/);
});

test('falls back to a plain string instead of throwing for an unrecognized currency code', () => {
  assert.doesNotThrow(() => formatApproxLocalAmount(5, 'ZZZ', 2));
});

test('never produces a negative or NaN-looking amount for a sane input', () => {
  const label = formatApproxLocalAmount(20, 'GHS', 19);
  assert.doesNotMatch(label, /NaN|-/);
});
