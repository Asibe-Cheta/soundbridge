import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateStorageCompliance,
  checkFreeStorageCompliance,
  FREE_TIER_STORAGE_LIMIT_BYTES,
} from '../storage-quota-compliance';

test('empty public tracks is trivially compliant', () => {
  const result = evaluateStorageCompliance([]);
  assert.equal(result.compliant, true);
  assert.equal(result.publicStorageBytes, 0);
});

test('tracks exactly at the limit are compliant', () => {
  const result = evaluateStorageCompliance([{ file_size: FREE_TIER_STORAGE_LIMIT_BYTES }]);
  assert.equal(result.compliant, true);
});

test('tracks one byte over the limit are not compliant', () => {
  const result = evaluateStorageCompliance([{ file_size: FREE_TIER_STORAGE_LIMIT_BYTES + 1 }]);
  assert.equal(result.compliant, false);
});

test('null file_size is treated as zero, not an error', () => {
  const result = evaluateStorageCompliance([{ file_size: null }, { file_size: 1000 }]);
  assert.equal(result.publicStorageBytes, 1000);
});

test('a custom limit is respected', () => {
  const result = evaluateStorageCompliance([{ file_size: 500 }], 400);
  assert.equal(result.compliant, false);
});

function makeFakeService(tracks: { file_size: number | null }[] | { error: true }) {
  return {
    from(table: string) {
      if (table !== 'audio_tracks') throw new Error(`unexpected table: ${table}`);
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        is: async () => (Array.isArray(tracks) ? { data: tracks, error: null } : { data: null, error: new Error('boom') }),
      };
    },
  } as unknown as SupabaseClient;
}

test('checkFreeStorageCompliance reads only public, non-deleted tracks for the user', async () => {
  const service = makeFakeService([{ file_size: 1000 }, { file_size: 2000 }]);
  const result = await checkFreeStorageCompliance(service, 'user-1');
  assert.equal(result.publicStorageBytes, 3000);
  assert.equal(result.compliant, true);
});

test('checkFreeStorageCompliance fails closed (not compliant) when the read errors', async () => {
  const service = makeFakeService({ error: true });
  const result = await checkFreeStorageCompliance(service, 'user-1');
  assert.equal(result.compliant, false);
});
