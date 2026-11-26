import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgreementToken, hashAgreementToken, hashesMatch } from '../agreement-token';

test('generateAgreementToken returns at least 32 bytes of randomness and never repeats', () => {
  const a = generateAgreementToken();
  const b = generateAgreementToken();
  assert.notEqual(a, b);
  assert.ok(Buffer.from(a, 'base64url').length >= 32);
});

test('hashAgreementToken is deterministic and never returns the raw token', () => {
  const token = generateAgreementToken();
  const hash = hashAgreementToken(token);
  assert.equal(hash, hashAgreementToken(token));
  assert.notEqual(hash, token);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('hashesMatch is true only for the same hash', () => {
  const token = generateAgreementToken();
  const hash = hashAgreementToken(token);
  assert.equal(hashesMatch(hash, hash), true);
  assert.equal(hashesMatch(hash, hashAgreementToken(generateAgreementToken())), false);
});

test('hashesMatch returns false (not throws) for mismatched lengths', () => {
  assert.equal(hashesMatch('ab', 'abcd'), false);
});
