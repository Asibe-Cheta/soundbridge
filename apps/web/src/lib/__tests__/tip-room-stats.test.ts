import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordTipRoomTipStat, backfillTipRoomTipsUsd } from '../tip-room-stats';
import type { FxRateLookup } from '../fx-rates';

type InsertedRow = Record<string, unknown>;

/** Fake tip_room_tips: enforces the real unique-on-stripe_payment_intent_id behaviour. */
function makeFakeSupabase() {
  const inserted: InsertedRow[] = [];
  const updateCalls: Array<{ id: string; payload: Record<string, unknown> }> = [];

  const builder = {
    insert(payload: InsertedRow) {
      const pi = payload.stripe_payment_intent_id;
      if (pi && inserted.some((r) => r.stripe_payment_intent_id === pi)) {
        return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
      }
      inserted.push(payload);
      return Promise.resolve({ error: null });
    },
    select() { return this; },
    is(column: string, value: null) {
      // Simulates "WHERE amount_usd_cents IS NULL" against rows already backfilled.
      const rows = inserted.filter((r) => (r as Record<string, unknown>)[column] === undefined || (r as Record<string, unknown>)[column] === value);
      return Promise.resolve({ data: rows.map((r, i) => ({ id: `row-${i}`, currency: r.currency, amount: r.amount, tipped_at: r.tipped_at })), error: null });
    },
    update(payload: Record<string, unknown>) {
      return {
        eq: (_col: string, id: string) => ({
          is: async () => {
            updateCalls.push({ id, payload });
            const row = inserted.find((_, i) => `row-${i}` === id);
            if (row) Object.assign(row, payload);
            return { error: null };
          },
        }),
      };
    },
  };

  const supabase = {
    from(table: string) {
      if (table === 'tip_room_tips') return builder;
      throw new Error(`unexpected table in test: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { supabase, inserted, updateCalls };
}

test('inserts with USD columns when an fx rate is available (pence rounding)', async () => {
  const { supabase, inserted } = makeFakeSupabase();
  const fxStub = async (): Promise<FxRateLookup | null> => ({
    rate: 1.27, // 1 GBP = 1.27 USD
    source: 'fx_rates_daily',
    asOfDate: '2026-11-22',
  });

  await recordTipRoomTipStat(
    supabase,
    { creatorId: 'creator-1', amount: 4.15, currency: 'gbp', paymentIntentId: 'pi_1' },
    fxStub,
  );

  assert.equal(inserted.length, 1);
  // 4.15 * 1.27 * 100 = 527.05 -> rounds to 527, not truncated to 527.0499999...
  assert.equal(inserted[0].amount_usd_cents, 527);
  assert.equal(inserted[0].fx_rate, 1.27);
  assert.equal(inserted[0].fx_rate_source, 'fx_rates_daily');
});

test('FX-missing fallback: still inserts the tip, with USD columns left out', async () => {
  const { supabase, inserted } = makeFakeSupabase();
  const fxStub = async (): Promise<FxRateLookup | null> => null;

  await assert.doesNotReject(() =>
    recordTipRoomTipStat(
      supabase,
      { creatorId: 'creator-1', amount: 10, currency: 'gbp', paymentIntentId: 'pi_2' },
      fxStub,
    ),
  );

  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].amount, 10);
  assert.equal('amount_usd_cents' in inserted[0], false);
});

test('duplicate webhook delivery for the same PaymentIntent does not double-insert', async () => {
  const { supabase, inserted } = makeFakeSupabase();
  const fxStub = async (): Promise<FxRateLookup | null> => null;
  const params = { creatorId: 'creator-1', amount: 5, currency: 'gbp', paymentIntentId: 'pi_dup' };

  await recordTipRoomTipStat(supabase, params, fxStub);
  await assert.doesNotReject(() => recordTipRoomTipStat(supabase, params, fxStub));

  assert.equal(inserted.length, 1, 'second delivery for the same PI must not create a second row');
});

test('backfill is idempotent: re-running after a successful pass updates nothing further', async () => {
  const { supabase, inserted, updateCalls } = makeFakeSupabase();
  const fxStub = async (): Promise<FxRateLookup | null> => null; // insert without USD columns first
  await recordTipRoomTipStat(supabase, { creatorId: 'c1', amount: 5, currency: 'gbp', paymentIntentId: 'pi_a' }, fxStub);
  await recordTipRoomTipStat(supabase, { creatorId: 'c2', amount: 8, currency: 'gbp', paymentIntentId: 'pi_b' }, fxStub);
  assert.equal(inserted.length, 2);

  const rateStub = async (): Promise<FxRateLookup | null> => ({ rate: 1.2, source: 'fx_rates_daily', asOfDate: '2026-11-22' });

  const firstPass = await backfillTipRoomTipsUsd(supabase, rateStub);
  assert.equal(firstPass.updated, 2);
  assert.equal(firstPass.skipped, 0);
  assert.equal(updateCalls.length, 2);

  const secondPass = await backfillTipRoomTipsUsd(supabase, rateStub);
  assert.equal(secondPass.updated, 0, 'rows already backfilled must not be re-selected or re-updated');
  assert.equal(secondPass.skipped, 0);
  assert.equal(updateCalls.length, 2, 'no additional update calls on the second pass');
});

test('backfill leaves a row untouched (not errored) when no rate is available for it', async () => {
  const { supabase } = makeFakeSupabase();
  const fxStub = async (): Promise<FxRateLookup | null> => null;
  await recordTipRoomTipStat(supabase, { creatorId: 'c1', amount: 5, currency: 'gbp', paymentIntentId: 'pi_c' }, fxStub);

  const noRateStub = async (): Promise<FxRateLookup | null> => null;
  const result = await backfillTipRoomTipsUsd(supabase, noRateStub);
  assert.equal(result.updated, 0);
  assert.equal(result.skipped, 1);
});
