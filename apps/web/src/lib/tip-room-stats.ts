import type { SupabaseClient } from '@supabase/supabase-js';

/** Idempotent stat row for Tip Room QR tips (mobile counters). */
export async function recordTipRoomTipStat(
  service: SupabaseClient,
  params: {
    creatorId: string;
    amount: number;
    currency: string;
    paymentIntentId: string;
  },
): Promise<void> {
  const { error } = await service.from('tip_room_tips').insert({
    creator_id: params.creatorId,
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    tipped_at: new Date().toISOString(),
    stripe_payment_intent_id: params.paymentIntentId,
  });

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return;
    }
    console.error('[tip-room-stats] insert failed:', error);
  }
}
