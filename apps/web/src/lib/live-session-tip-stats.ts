import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Records a live_session_tips row using already-verified data from a
 * succeeded Stripe PaymentIntent (same amount/fee values the webhook just
 * used to finalize the real tip in tips/creator_tips) -- never called with
 * client-supplied amounts. This is a stats/notification-trigger table, not
 * the money ledger, so a FK mismatch between liveStreamId metadata and
 * live_sessions.id (if the live-streaming schema has since diverged) fails
 * harmlessly here: log and move on, never throw back into the webhook.
 */
export async function recordLiveSessionTipIfApplicable(
  supabase: SupabaseClient,
  params: {
    /** live_sessions.id -- a different feature/id space from live_streams. */
    sessionId: string | null;
    creatorId: string;
    tipperId: string;
    amount: number;
    currency: string;
    platformFee: number;
    creatorEarnings: number;
    message: string | null;
    paymentIntentId: string;
  },
): Promise<void> {
  if (!params.sessionId) return;

  const { error } = await supabase.from('live_session_tips').insert({
    session_id: params.sessionId,
    tipper_id: params.tipperId,
    creator_id: params.creatorId,
    amount: params.amount,
    currency: params.currency,
    platform_fee_amount: params.platformFee,
    creator_amount: params.creatorEarnings,
    message: params.message || null,
    stripe_payment_intent_id: params.paymentIntentId,
    status: 'completed',
  });

  if (error) {
    // 23503 = FK violation (liveStreamId didn't match a live_sessions row --
    // possible if this metadata key is used for a different live-streaming
    // table in some caller). 23505 = duplicate (webhook retry). Both benign.
    const code = (error as { code?: string }).code;
    if (code !== '23503' && code !== '23505') {
      console.error('[live-session-tip-stats] insert failed:', error);
    }
  }
}
