import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAgreementRateLimit, hashAgreementIp } from '../agreement-rate-limit';

type Hit = { ip_hash: string; created_at: string };

function makeFakeSupabase(existingHits: Hit[] = []) {
  const hits = [...existingHits];
  const inserted: Hit[] = [];

  const builder = {
    _filters: {} as { eq?: [string, string]; gte?: string },
    select() {
      return this;
    },
    eq(column: string, value: string) {
      this._filters.eq = [column, value];
      return this;
    },
    gte(_column: string, value: string) {
      this._filters.gte = value;
      const [col, val] = this._filters.eq!;
      const since = this._filters.gte!;
      const count = hits.filter(
        (h) => (h as unknown as Record<string, string>)[col] === val && h.created_at >= since,
      ).length;
      return Promise.resolve({ count, error: null });
    },
    insert(payload: { ip_hash: string }) {
      const row = { ...payload, created_at: new Date().toISOString() };
      hits.push(row);
      inserted.push(row);
      return Promise.resolve({ error: null });
    },
  };

  const supabase = {
    from(table: string) {
      if (table !== 'agreement_rate_limit_hits') throw new Error(`unexpected table: ${table}`);
      return { ...builder, _filters: {} };
    },
  } as unknown as SupabaseClient;

  return { supabase, hits, inserted };
}

test('hashAgreementIp never returns the raw IP and is deterministic', () => {
  const ip = '198.51.100.7';
  const hash = hashAgreementIp(ip);
  assert.notEqual(hash, ip);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashAgreementIp(ip));
});

test('allows a request under the cap and records the hit', async () => {
  const { supabase, inserted } = makeFakeSupabase();
  const result = await checkAgreementRateLimit(supabase, 'ip-a');
  assert.deepEqual(result, { allowed: true });
  assert.equal(inserted.length, 1);
});

test('blocks once the IP hash has hit its cap, without recording another hit', async () => {
  const now = new Date().toISOString();
  const existing: Hit[] = Array.from({ length: 10 }, () => ({ ip_hash: 'ip-busy', created_at: now }));
  const { supabase, inserted } = makeFakeSupabase(existing);

  const result = await checkAgreementRateLimit(supabase, 'ip-busy', { max: 10 });
  assert.deepEqual(result, { allowed: false });
  assert.equal(inserted.length, 0, 'a blocked request must not also record a hit');
});

test('hits outside the window do not count toward the cap', async () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const existing: Hit[] = Array.from({ length: 10 }, () => ({ ip_hash: 'ip-cooled', created_at: old }));
  const { supabase } = makeFakeSupabase(existing);

  const result = await checkAgreementRateLimit(supabase, 'ip-cooled', { windowMs: 10 * 60 * 1000, max: 5 });
  assert.deepEqual(result, { allowed: true });
});
