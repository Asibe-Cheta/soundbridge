import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLATFORM_FEE_DECIMAL, PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';

export function isRequestRoomTipPaymentIntent(pi: Stripe.PaymentIntent): boolean {
  return pi.metadata?.charge_type === 'request_room_tip';
}

export type FinalizeRequestRoomResult = { ok: true } | { ok: false; reason: string };

function asBool(v: string | undefined): boolean {
  return String(v || '').toLowerCase() === 'true';
}

export async function finalizeRequestRoomFromSucceededPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  supabase: SupabaseClient,
): Promise<FinalizeRequestRoomResult> {
  try {
    if (!isRequestRoomTipPaymentIntent(paymentIntent)) return { ok: true };
    const metadata = paymentIntent.metadata || {};
    const paymentIntentId = paymentIntent.id;

    const sessionId = String(metadata.session_id || '').trim();
    const creatorId = String(metadata.creator_id || '').trim();
    const songRequest = String(metadata.song_request || '').trim();
    const tipperName = String(metadata.tipper_name || 'Anonymous').trim() || 'Anonymous';
    const leadEmail = String(metadata.lead_email || '').trim().toLowerCase();
    const gdprConsent = asBool(metadata.gdpr_consent);

    if (!sessionId || !creatorId || !songRequest) {
      console.error('[request-room webhook] missing required metadata', {
        sessionId: !!sessionId,
        creatorId: !!creatorId,
        songRequest: !!songRequest,
      });
      return { ok: false, reason: 'missing_metadata' };
    }

    const { data: existingReq } = await supabase
      .from('request_room_requests')
      .select('id')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();
    if (existingReq) {
      return { ok: true };
    }

    const amountMajor = Number((paymentIntent.amount_received || paymentIntent.amount || 0) / 100);
    if (!(amountMajor > 0)) {
      return { ok: false, reason: 'invalid_amount' };
    }
    const currency = String(paymentIntent.currency || 'usd').toUpperCase();

    const platformFee = Math.round(amountMajor * PLATFORM_FEE_DECIMAL * 100) / 100;
    const creatorEarnings = Math.max(0, Math.round((amountMajor - platformFee) * 100) / 100);

    const { error: insertErr } = await supabase.from('request_room_requests').insert({
      session_id: sessionId,
      creator_id: creatorId,
      song_request: songRequest,
      tipper_name: tipperName,
      tipper_user_id: null,
      tip_amount: amountMajor,
      payment_intent_id: paymentIntentId,
      status: 'pending',
    });
    if (insertErr) {
      console.error('[request-room webhook] insert request error:', insertErr);
      return { ok: false, reason: 'insert_request_failed' };
    }

    if (leadEmail && gdprConsent) {
      const { error: leadErr } = await supabase.from('request_room_leads').insert({
        session_id: sessionId,
        creator_id: creatorId,
        email: leadEmail,
        tip_amount: amountMajor,
        song_request: songRequest,
        gdpr_consent: true,
        converted: false,
      });
      if (leadErr) {
        console.error('[request-room webhook] lead insert error:', leadErr);
      }
    }

    const { data: sessionRow, error: sessionReadErr } = await supabase
      .from('request_room_sessions')
      .select('total_tips_collected,total_requests_received')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionReadErr) {
      console.error('[request-room webhook] session read error:', sessionReadErr);
    } else if (sessionRow) {
      const { error: sessionErr } = await supabase
        .from('request_room_sessions')
        .update({
          total_tips_collected: Number(sessionRow.total_tips_collected || 0) + amountMajor,
          total_requests_received: Number(sessionRow.total_requests_received || 0) + 1,
        })
        .eq('id', sessionId);
      if (sessionErr) {
        console.error('[request-room webhook] session totals update error:', sessionErr);
      }
    }

    const { error: walletErr } = await supabase.rpc('add_wallet_transaction', {
      user_uuid: creatorId,
      transaction_type: 'tip_received',
      amount: creatorEarnings,
      description: `Request Room tip: ${songRequest}`,
      reference_id: paymentIntentId,
      metadata: {
        source: 'request_room',
        session_id: sessionId,
        tipper_name: tipperName,
        gross_amount: amountMajor,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        platform_fee_percent: PLATFORM_FEE_PERCENT,
      },
      p_currency: currency,
      p_stripe_payment_intent_id: paymentIntentId,
    });
    if (walletErr) {
      console.error('[request-room webhook] wallet credit error:', walletErr);
      return { ok: false, reason: 'wallet_credit_failed' };
    }

    return { ok: true };
  } catch (error) {
    console.error('[request-room webhook] unexpected error:', error);
    return { ok: false, reason: 'exception' };
  }
}

