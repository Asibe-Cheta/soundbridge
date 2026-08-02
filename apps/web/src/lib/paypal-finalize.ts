import type { SupabaseClient } from '@supabase/supabase-js';
import { PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';
import { recordTipRoomTipStat } from '@/src/lib/tip-room-stats';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';
import { SendGridService } from '@/src/lib/sendgrid-service';
import { notifyCreatorContentPurchasePush } from '@/src/lib/content-purchase-push';

export type PayPalChargeType = 'tip_room' | 'fan_landing_tip' | 'request_room_tip' | 'content_purchase';

export interface PayPalPendingCharge {
  id: string;
  charge_type: PayPalChargeType;
  creator_id: string;
  payer_id: string | null;
  amount: number;
  currency: string;
  platform_fee: number;
  creator_earnings: number;
  metadata: Record<string, any>;
  status: 'pending' | 'captured' | 'failed';
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
}

export type FinalizeResult = { ok: boolean; reason?: string };

/**
 * Idempotent: safe to call from both the client-driven capture-order route and the PayPal
 * webhook backstop. add_wallet_transaction dedupes on (user_id, reference_id/p_stripe_payment_intent_id,
 * transaction_type) — we pass the PayPal capture id into p_stripe_payment_intent_id, giving the
 * same idempotency Stripe's path gets, even though it's not actually a Stripe id.
 */
export async function finalizePayPalCharge(
  supabase: SupabaseClient,
  chargeRaw: PayPalPendingCharge,
  captureId: string,
): Promise<FinalizeResult> {
  // Postgres DECIMAL columns come back as strings via PostgREST, not JS numbers (same reason
  // the Stripe finalize webhooks wrap every amount field in Number(...) before using it).
  const charge: PayPalPendingCharge = {
    ...chargeRaw,
    amount: Number(chargeRaw.amount),
    platform_fee: Number(chargeRaw.platform_fee),
    creator_earnings: Number(chargeRaw.creator_earnings),
  };
  try {
    switch (charge.charge_type) {
      case 'tip_room':
      case 'fan_landing_tip':
        return await finalizeFanLandingStyleTip(supabase, charge, captureId);
      case 'request_room_tip':
        return await finalizeRequestRoomTip(supabase, charge, captureId);
      case 'content_purchase':
        return await finalizeContentPurchase(supabase, charge, captureId);
      default:
        return { ok: false, reason: 'unknown_charge_type' };
    }
  } catch (error) {
    console.error('[finalizePayPalCharge] unhandled exception:', error);
    return { ok: false, reason: 'exception' };
  }
}

/** Mirrors finalizeFanLandingGuestTipFromPaymentIntent in tip-payment-intent-webhook.ts.
 *  Both tip-room-tip and fan-landing-tip write into fan_landing_tips, distinguished by `source`. */
async function finalizeFanLandingStyleTip(
  supabase: SupabaseClient,
  charge: PayPalPendingCharge,
  captureId: string,
): Promise<FinalizeResult> {
  const meta = charge.metadata || {};
  const source = charge.charge_type === 'tip_room' ? 'tip_room' : 'fan_landing_page';
  const guestEmail = String(meta.guest_email || '').trim();
  const guestName = typeof meta.guest_name === 'string' ? meta.guest_name.trim() : '';
  const message = typeof meta.message === 'string' ? meta.message.trim() : '';

  const { data: existing } = await supabase
    .from('fan_landing_tips')
    .select('id, status')
    .eq('stripe_payment_intent_id', captureId)
    .maybeSingle();

  if (!existing) {
    const { error: insertErr } = await supabase.from('fan_landing_tips').insert({
      creator_id: charge.creator_id,
      guest_email: guestEmail || 'tip-room@guest.soundbridge.live',
      guest_name: guestName || null,
      amount: charge.amount,
      currency: charge.currency.toUpperCase(),
      stripe_payment_intent_id: captureId,
      source,
      status: 'completed',
      completed_at: new Date().toISOString(),
      message: message || null,
    });
    if (insertErr) {
      console.error('[paypal finalize][fan_landing] insert failed:', insertErr);
      return { ok: false, reason: 'insert_failed' };
    }
  } else if (existing.status === 'completed') {
    return { ok: true }; // already finalized (webhook + client-capture both fired)
  } else {
    await supabase
      .from('fan_landing_tips')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', existing.id);
  }

  const { error: walletError } = await supabase.rpc('add_wallet_transaction', {
    user_uuid: charge.creator_id,
    transaction_type: 'tip_received',
    amount: charge.creator_earnings,
    description: `Tip received${message ? `: ${message}` : ''}`,
    reference_id: captureId,
    metadata: {
      tipper_id: 'paypal_guest',
      original_amount: charge.amount,
      creator_earnings: charge.creator_earnings,
      platform_fee: charge.platform_fee,
      tip_message: message,
      payment_method: 'paypal',
    },
    p_currency: charge.currency.toUpperCase(),
    p_stripe_payment_intent_id: captureId,
  });
  if (walletError) {
    console.error('[paypal finalize][fan_landing] wallet credit failed:', walletError);
    return { ok: false, reason: 'wallet_failed' };
  }

  try {
    const { error: revenueErr } = await supabase.rpc('insert_platform_revenue', {
      p_charge_type: 'tip',
      p_gross_amount: Math.round(charge.amount * 100),
      p_platform_fee_amount: Math.round(charge.platform_fee * 100),
      p_platform_fee_percent: PLATFORM_FEE_PERCENT,
      p_creator_payout_amount: Math.round(charge.creator_earnings * 100),
      p_stripe_payment_intent_id: captureId,
      p_reference_id: captureId,
      p_creator_user_id: charge.creator_id,
      p_currency: charge.currency.toUpperCase(),
      p_payment_method_type: 'paypal',
    });
    if (revenueErr) console.error('[paypal finalize][fan_landing] insert_platform_revenue:', revenueErr);
  } catch (err) {
    console.error('[paypal finalize][fan_landing] insert_platform_revenue:', err);
  }

  if (source === 'tip_room') {
    await recordTipRoomTipStat(supabase, {
      creatorId: charge.creator_id,
      amount: charge.amount,
      currency: charge.currency.toLowerCase(),
      paymentIntentId: captureId,
    });
  }

  try {
    const formattedAmount = `${charge.currency.toUpperCase()} ${charge.amount.toFixed(2)}`;
    await sendExpoPushIfAllowed(supabase, charge.creator_id, 'tip', {
      title: `A fan tipped you ${formattedAmount}`,
      body: guestEmail ? `From ${guestEmail}` : 'Check your wallet',
      data: {
        type: 'tip',
        entityId: existing?.id ?? captureId,
        entityType: 'fan_landing_tip',
        creatorId: '',
        username: '',
        amount: formattedAmount,
        tipperId: 'paypal_guest',
        currency: charge.currency.toUpperCase(),
      },
      channelId: 'tips',
      priority: 'high',
    });
  } catch (e) {
    console.error('[paypal finalize][fan_landing] push:', e);
  }

  return { ok: true };
}

/** Mirrors finalizeRequestRoomFromSucceededPaymentIntent in request-room-payment-intent-webhook.ts.
 *  Note: the Stripe path doesn't call insert_platform_revenue for this flow either — mirrored as-is. */
async function finalizeRequestRoomTip(
  supabase: SupabaseClient,
  charge: PayPalPendingCharge,
  captureId: string,
): Promise<FinalizeResult> {
  const meta = charge.metadata || {};
  const sessionId = String(meta.session_id || '').trim();
  const songRequest = String(meta.song_request || '').trim();
  const tipperName = String(meta.tipper_name || 'Anonymous').trim() || 'Anonymous';
  const leadEmail = String(meta.lead_email || '').trim().toLowerCase();
  const gdprConsent = Boolean(meta.gdpr_consent);

  if (!sessionId || !songRequest) {
    return { ok: false, reason: 'missing_metadata' };
  }

  const { data: existingReq } = await supabase
    .from('request_room_requests')
    .select('id')
    .eq('payment_intent_id', captureId)
    .maybeSingle();
  if (existingReq) return { ok: true };

  const { error: insertErr } = await supabase.from('request_room_requests').insert({
    session_id: sessionId,
    creator_id: charge.creator_id,
    song_request: songRequest,
    tipper_name: tipperName,
    tipper_user_id: null,
    tip_amount: charge.amount,
    payment_intent_id: captureId,
    status: 'pending',
    payment_method_type: 'paypal',
  });
  if (insertErr) {
    console.error('[paypal finalize][request_room] insert failed:', insertErr);
    return { ok: false, reason: 'insert_request_failed' };
  }

  if (leadEmail && gdprConsent) {
    const { error: leadErr } = await supabase.from('request_room_leads').insert({
      session_id: sessionId,
      creator_id: charge.creator_id,
      email: leadEmail,
      tip_amount: charge.amount,
      song_request: songRequest,
      gdpr_consent: true,
      converted: false,
    });
    if (leadErr) console.error('[paypal finalize][request_room] lead insert error:', leadErr);
  }

  const { data: sessionRow, error: sessionReadErr } = await supabase
    .from('request_room_sessions')
    .select('total_tips_collected,total_requests_received')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionReadErr) {
    console.error('[paypal finalize][request_room] session read error:', sessionReadErr);
  } else if (sessionRow) {
    const { error: sessionErr } = await supabase
      .from('request_room_sessions')
      .update({
        total_tips_collected: Number(sessionRow.total_tips_collected || 0) + charge.amount,
        total_requests_received: Number(sessionRow.total_requests_received || 0) + 1,
      })
      .eq('id', sessionId);
    if (sessionErr) console.error('[paypal finalize][request_room] session totals update error:', sessionErr);
  }

  const { error: walletErr } = await supabase.rpc('add_wallet_transaction', {
    user_uuid: charge.creator_id,
    transaction_type: 'tip_received',
    amount: charge.creator_earnings,
    description: `Request Room tip: ${songRequest}`,
    reference_id: captureId,
    metadata: {
      source: 'request_room',
      session_id: sessionId,
      tipper_name: tipperName,
      gross_amount: charge.amount,
      platform_fee: charge.platform_fee,
      creator_earnings: charge.creator_earnings,
      platform_fee_percent: PLATFORM_FEE_PERCENT,
      payment_method: 'paypal',
    },
    p_currency: charge.currency.toUpperCase(),
    p_stripe_payment_intent_id: captureId,
  });
  if (walletErr) {
    console.error('[paypal finalize][request_room] wallet credit error:', walletErr);
    return { ok: false, reason: 'wallet_credit_failed' };
  }

  return { ok: true };
}

/** Mirrors recordContentSaleFromPaymentIntent in content-purchase-payment-intent-webhook.ts. */
async function finalizeContentPurchase(
  supabase: SupabaseClient,
  charge: PayPalPendingCharge,
  captureId: string,
): Promise<FinalizeResult> {
  const meta = charge.metadata || {};
  const contentId = String(meta.content_id || '').trim();
  const contentType = String(meta.content_type || '').trim();

  if (!contentId || !contentType) {
    return { ok: false, reason: 'missing_metadata' };
  }

  const { data: existingPurchase } = await supabase
    .from('content_purchases')
    .select('id')
    .eq('transaction_id', captureId)
    .maybeSingle();
  if (existingPurchase) return { ok: true };

  const { error: purchaseError } = await supabase.from('content_purchases').insert({
    user_id: charge.payer_id,
    content_id: contentId,
    content_type: contentType,
    price_paid: charge.amount,
    currency: charge.currency.toUpperCase(),
    platform_fee: charge.platform_fee,
    creator_earnings: charge.creator_earnings,
    transaction_id: captureId,
    status: 'completed',
    payment_method_type: 'paypal',
  });
  if (purchaseError) {
    console.error('[paypal finalize][content_purchase] insert failed:', purchaseError);
    return { ok: false, reason: 'insert_failed' };
  }

  const { error: walletError } = await supabase.rpc('add_wallet_transaction', {
    user_uuid: charge.creator_id,
    transaction_type: 'content_sale',
    amount: charge.creator_earnings,
    description: 'Sale: Content purchase',
    reference_id: captureId,
    metadata: {
      content_id: contentId,
      content_type: contentType,
      buyer_id: charge.payer_id,
      original_price: charge.amount,
      platform_fee: charge.platform_fee,
      payment_method: 'paypal',
    },
    p_currency: charge.currency.toUpperCase(),
    p_stripe_payment_intent_id: captureId,
  });
  if (walletError) {
    console.error('[paypal finalize][content_purchase] wallet credit failed:', walletError);
    return { ok: false, reason: 'wallet_failed' };
  }

  try {
    const chargeTypeMeta = contentType === 'album' ? 'album_sale' : 'audio_sale';
    const { error: revenueErr } = await supabase.rpc('insert_platform_revenue', {
      p_charge_type: chargeTypeMeta,
      p_gross_amount: Math.round(charge.amount * 100),
      p_platform_fee_amount: Math.round(charge.platform_fee * 100),
      p_platform_fee_percent: PLATFORM_FEE_PERCENT,
      p_creator_payout_amount: Math.round(charge.creator_earnings * 100),
      p_stripe_payment_intent_id: captureId,
      p_reference_id: captureId,
      p_creator_user_id: charge.creator_id,
      p_currency: charge.currency.toUpperCase(),
      p_payment_method_type: 'paypal',
    });
    if (revenueErr) console.error('[paypal finalize][content_purchase] insert_platform_revenue:', revenueErr);
  } catch (err) {
    console.error('[paypal finalize][content_purchase] insert_platform_revenue:', err);
  }

  if (contentType === 'track') {
    const { data: currentTrack } = await supabase
      .from('audio_tracks')
      .select('total_sales_count, total_revenue')
      .eq('id', contentId)
      .single();
    await supabase
      .from('audio_tracks')
      .update({
        total_sales_count: (currentTrack?.total_sales_count || 0) + 1,
        total_revenue: Number(currentTrack?.total_revenue || 0) + charge.amount,
      })
      .eq('id', contentId);
  } else if (contentType === 'album') {
    const { data: currentAlbum } = await supabase
      .from('albums')
      .select('total_sales_count, total_revenue')
      .eq('id', contentId)
      .single();
    await supabase
      .from('albums')
      .update({
        total_sales_count: (currentAlbum?.total_sales_count || 0) + 1,
        total_revenue: Number(currentAlbum?.total_revenue || 0) + charge.amount,
      })
      .eq('id', contentId);
  }

  let contentTitle = 'Content';
  if (contentType === 'track') {
    const { data: track } = await supabase.from('audio_tracks').select('title').eq('id', contentId).single();
    contentTitle = track?.title || 'Content';
  } else if (contentType === 'album') {
    const { data: album } = await supabase.from('albums').select('title').eq('id', contentId).single();
    contentTitle = album?.title || 'Content';
  }

  try {
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', charge.payer_id)
      .single();
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', charge.creator_id)
      .single();

    if (buyerProfile?.email) {
      await SendGridService.sendPurchaseConfirmationEmail({
        to: buyerProfile.email,
        userName: buyerProfile.display_name || buyerProfile.username || 'User',
        contentTitle,
        creatorName: creatorProfile?.display_name || creatorProfile?.username || 'Creator',
        pricePaid: charge.amount,
        currency: charge.currency.toUpperCase(),
        transactionId: captureId,
        purchaseDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        libraryUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/user/purchases`,
      });
    }
    if (creatorProfile?.email) {
      await SendGridService.sendSaleNotificationEmail({
        to: creatorProfile.email,
        creatorName: creatorProfile.display_name || creatorProfile.username || 'Creator',
        contentTitle,
        buyerUsername: buyerProfile?.username || 'User',
        amountEarned: charge.creator_earnings,
        currency: charge.currency.toUpperCase(),
        analyticsUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/creator/sales`,
      });
    }
  } catch (emailError) {
    console.error('[paypal finalize][content_purchase] email notifications:', emailError);
  }

  void notifyCreatorContentPurchasePush({
    creatorId: charge.creator_id,
    buyerId: charge.payer_id || '',
    contentId,
    contentType,
    title: contentTitle,
    amount: charge.amount,
    currency: charge.currency.toUpperCase(),
  });

  return { ok: true };
}
