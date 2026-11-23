import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordLiveSessionTipIfApplicable } from '../live-session-tip-stats';

function makeFakeSupabase(insertResult: { error: { code?: string } | null } = { error: null }) {
  const inserted: Record<string, unknown>[] = [];
  const supabase = {
    from(table: string) {
      if (table !== 'live_session_tips') throw new Error(`unexpected table: ${table}`);
      return {
        insert: async (payload: Record<string, unknown>) => {
          inserted.push(payload);
          return insertResult;
        },
      };
    },
  } as unknown as SupabaseClient;
  return { supabase, inserted };
}

const baseParams = {
  creatorId: 'creator-1',
  tipperId: 'tipper-1',
  amount: 5,
  currency: 'GBP',
  platformFee: 0.75,
  creatorEarnings: 4.25,
  message: 'nice set',
  paymentIntentId: 'pi_123',
};

test('does nothing when sessionId is absent', async () => {
  const { supabase, inserted } = makeFakeSupabase();
  await recordLiveSessionTipIfApplicable(supabase, { ...baseParams, sessionId: null });
  assert.equal(inserted.length, 0);
});

test('inserts the verified amounts, not anything client-supplied, when sessionId is present', async () => {
  const { supabase, inserted } = makeFakeSupabase();
  await recordLiveSessionTipIfApplicable(supabase, { ...baseParams, sessionId: 'session-1' });
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0], {
    session_id: 'session-1',
    tipper_id: 'tipper-1',
    creator_id: 'creator-1',
    amount: 5,
    currency: 'GBP',
    platform_fee_amount: 0.75,
    creator_amount: 4.25,
    message: 'nice set',
    stripe_payment_intent_id: 'pi_123',
    status: 'completed',
  });
});

test('a foreign-key mismatch (wrong id space) is swallowed silently, never thrown', async () => {
  const { supabase } = makeFakeSupabase({ error: { code: '23503' } });
  await assert.doesNotReject(() =>
    recordLiveSessionTipIfApplicable(supabase, { ...baseParams, sessionId: 'session-1' }),
  );
});

test('a duplicate insert (webhook retry) is swallowed silently', async () => {
  const { supabase } = makeFakeSupabase({ error: { code: '23505' } });
  await assert.doesNotReject(() =>
    recordLiveSessionTipIfApplicable(supabase, { ...baseParams, sessionId: 'session-1' }),
  );
});
