import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTierFromEntitlements } from '../revenuecat-entitlements';

const FUTURE = Date.now() + 1000 * 60 * 60 * 24;
const PAST = Date.now() - 1000 * 60 * 60 * 24;

function lookupMap(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

test('no active items resolves to free', () => {
  const result = resolveTierFromEntitlements(lookupMap({}), []);
  assert.deepEqual(result, { tier: 'free', periodEnd: null });
});

test('a single active premium entitlement resolves to premium with its expiry', () => {
  const map = lookupMap({ ent_premium: 'premium_features' });
  const result = resolveTierFromEntitlements(map, [{ entitlement_id: 'ent_premium', expires_at: FUTURE }]);
  assert.equal(result.tier, 'premium');
  assert.equal(result.periodEnd, new Date(FUTURE).toISOString());
});

test('unlimited wins over premium when both are active', () => {
  const map = lookupMap({ ent_premium: 'premium_features', ent_unlimited: 'unlimited_features' });
  const result = resolveTierFromEntitlements(map, [
    { entitlement_id: 'ent_premium', expires_at: FUTURE },
    { entitlement_id: 'ent_unlimited', expires_at: FUTURE },
  ]);
  assert.equal(result.tier, 'unlimited');
});

test('an expired entitlement is ignored', () => {
  const map = lookupMap({ ent_premium: 'premium_features' });
  const result = resolveTierFromEntitlements(map, [{ entitlement_id: 'ent_premium', expires_at: PAST }]);
  assert.deepEqual(result, { tier: 'free', periodEnd: null });
});

test('an entitlement with no expiry (lifetime) is treated as active, with a null periodEnd', () => {
  const map = lookupMap({ ent_premium: 'premium_features' });
  const result = resolveTierFromEntitlements(map, [{ entitlement_id: 'ent_premium', expires_at: null }]);
  assert.equal(result.tier, 'premium');
  assert.equal(result.periodEnd, null);
});

test('an entitlement id with no matching lookup key is ignored, not treated as paid', () => {
  const map = lookupMap({}); // empty -- entitlement_id below has no mapping
  const result = resolveTierFromEntitlements(map, [{ entitlement_id: 'unknown_ent', expires_at: FUTURE }]);
  assert.deepEqual(result, { tier: 'free', periodEnd: null });
});

test('a lookup key not in the premium/unlimited sets is ignored', () => {
  const map = lookupMap({ ent_other: 'some_other_entitlement' });
  const result = resolveTierFromEntitlements(map, [{ entitlement_id: 'ent_other', expires_at: FUTURE }]);
  assert.deepEqual(result, { tier: 'free', periodEnd: null });
});

test('picks the latest expiry among multiple active items of the same tier', () => {
  const map = lookupMap({ a: 'premium_features', b: 'premium' });
  const later = FUTURE + 1000 * 60 * 60;
  const result = resolveTierFromEntitlements(map, [
    { entitlement_id: 'a', expires_at: FUTURE },
    { entitlement_id: 'b', expires_at: later },
  ]);
  assert.equal(result.tier, 'premium');
  assert.equal(result.periodEnd, new Date(later).toISOString());
});
