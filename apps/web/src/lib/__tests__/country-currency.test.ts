import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currencyForCountry, COUNTRY_TO_CURRENCY } from '../../constants/country-currency';

test('maps a known country to its currency', () => {
  assert.equal(currencyForCountry('GH'), 'GHS');
  assert.equal(currencyForCountry('NG'), 'NGN');
  assert.equal(currencyForCountry('GB'), 'GBP');
});

test('is case-insensitive', () => {
  assert.equal(currencyForCountry('gh'), 'GHS');
});

test('returns null for an unrecognized country code', () => {
  assert.equal(currencyForCountry('ZZ'), null);
});

test('returns null for missing input', () => {
  assert.equal(currencyForCountry(null), null);
  assert.equal(currencyForCountry(undefined), null);
  assert.equal(currencyForCountry(''), null);
});

test('every value is a plausible 3-letter ISO 4217 code', () => {
  for (const [country, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    assert.match(currency, /^[A-Z]{3}$/, `${country} -> ${currency}`);
  }
});
