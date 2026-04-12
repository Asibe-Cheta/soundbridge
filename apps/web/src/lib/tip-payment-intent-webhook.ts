import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';

/**
 * create-tip sets metadata.charge_type = 'tip'. Main Stripe webhook must finalize tips
 * when confirm-tip is never called (mobile error) or user-scoped RLS blocks updates.
 */
export function isTipPaymentIntent(pi: Stripe.PaymentIntent): boolean {
  return pi.metadata?.charge_type === 'tip';
}

export type FinalizeTipResult = { ok: true } | { ok: false; reason: string };

/** True if creator was already credited for this Stripe PI (idempotency for webhooks + resends). */
async function tipWalletAlreadyCredited(
  supabase: SupabaseClient,
  paymentIntentId: string
): Promise<boolean> {
  const { data: byRef, error: errRef } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('transaction_type', 'tip_received')
    .eq('reference_id', paymentIntentId)
    .maybeSingle();
  if (errRef) {
    console.warn('[finalizeTip] wallet lookup by reference_id:', errRef.message);
  }
  if (byRef) return true;

  const { data: byPi } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('transaction_type', 'tip_received')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  return !!byPi;
}

/**
 * create-tip can fail after Stripe charges; metadata still has creatorId, tipperId, amounts.
 * Inserts pending rows so finalize can complete wallet + push.
 */
async function recoverMissingTipRowsFromMetadata(
  paymentIntent: Stripe.PaymentIntent,
  supabase: SupabaseClient
): Promise<{
  creatorTip: Record<string, unknown> | null;
  tipsRow: Record<string, unknown> | null;
  tipAnalytics: Record<string, unknown> | null;
} | null> {
  const meta = paymentIntent.metadata || {};
  const paymentIntentId = paymentIntent.id;
  const creatorId = String(meta.creatorId || meta.creator_id || meta.creator_user_id || '').trim();
  const tipperId = String(meta.tipperId || '').trim();
  if (!creatorId || !tipperId) {
    console.error('[finalizeTip] recover: missing creatorId or tipperId in metadata');
    return null;
  }

  const gross = paymentIntent.amount ?? 0;
  const amountMajor = gross > 0 ? gross / 100 : 0;
  if (!(amountMajor > 0)) {
    console.error('[finalizeTip] recover: invalid PaymentIntent amount');
    return null;
  }

  const platformFee = parseFloat(String(meta.platformFee ?? '0'));
  const creatorEarnings = parseFloat(String(meta.creatorEarnings ?? '0'));
  const rawTier = String(meta.userTier || 'free').toLowerCase();
  const analyticsTier = ['free', 'pro', 'enterprise'].includes(rawTier)
    ? rawTier
    : ['premium', 'unlimited'].includes(rawTier)
      ? 'pro'
      : 'free';
  const feePct = parseFloat(String(meta.platform_fee_percent ?? '15'));
  const currency = (paymentIntent.currency || 'usd').toUpperCase();
  const message = typeof meta.tipMessage === 'string' ? meta.tipMessage : '';
  const isAnonymous = meta.isAnonymous === 'true';

  const { error: ctErr } = await supabase.from('creator_tips').insert({
    creator_id: creatorId,
    tipper_id: tipperId,
    amount: amountMajor,
    currency,
    message: message || null,
    is_anonymous: isAnonymous,
    stripe_payment_intent_id: paymentIntentId,
    status: 'pending',
  });
  if (ctErr && (ctErr as { code?: string }).code !== '23505') {
    console.error('[finalizeTip] recover creator_tips insert:', ctErr);
  }

  const { error: tipsErr } = await supabase.from('tips').insert({
    sender_id: tipperId,
    recipient_id: creatorId,
    amount: amountMajor,
    currency,
    message: message || null,
    is_anonymous: isAnonymous,
    status: 'pending',
    payment_intent_id: paymentIntentId,
    platform_fee: platformFee,
    creator_earnings: creatorEarnings,
  });
  if (tipsErr && (tipsErr as { code?: string }).code !== '23505') {
    console.error('[finalizeTip] recover tips insert:', tipsErr);
  }

  const { error: taErr } = await supabase.from('tip_analytics').insert({
    creator_id: creatorId,
    tipper_id: tipperId,
    tipper_tier: analyticsTier,
    tip_amount: amountMajor,
    platform_fee: platformFee,
    creator_earnings: creatorEarnings,
    fee_percentage: feePct,
    tip_message: message || null,
    is_anonymous: isAnonymous,
    stripe_payment_intent_id: paymentIntentId,
    status: 'pending',
  });
  if (taErr && (taErr as { code?: string }).code !== '23505') {
    console.error('[finalizeTip] recover tip_analytics insert:', taErr);
  }

  const { data: creatorTip } = await supabase
    .from('creator_tips')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  const { data: tipsRow } = await supabase
    .from('tips')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();
  const { data: tipAnalytics } = await supabase
    .from('tip_analytics')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (!creatorTip && !tipsRow) {
    return null;
  }
  console.log('[finalizeTip] recovered DB rows from Stripe metadata for', paymentIntentId);
  return {
    creatorTip: creatorTip as Record<string, unknown> | null,
    tipsRow: tipsRow as Record<string, unknown> | null,
    tipAnalytics: tipAnalytics as Record<string, unknown> | null,
  };
}

/**
 * Idempotent: safe to call on every payment_intent.succeeded for tip PIs.
 * Expects service-role Supabase client (bypasses RLS on tips / creator_tips updates).
 */
export async function finalizeTipFromSucceededPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  supabase: SupabaseClient
): Promise<FinalizeTipResult> {
  try {
    return await finalizeTipFromSucceededPaymentIntentInner(paymentIntent, supabase);
  } catch (e) {
    console.error('[finalizeTip] unhandled exception (must not throw to Stripe webhook):', e);
    return { ok: false, reason: 'exception' };
  }
}

async function finalizeTipFromSucceededPaymentIntentInner(
  paymentIntent: Stripe.PaymentIntent,
  supabase: SupabaseClient
): Promise<FinalizeTipResult> {
  if (!isTipPaymentIntent(paymentIntent)) return { ok: true };

  const paymentIntentId = paymentIntent.id;
  const meta = paymentIntent.metadata || {};

  const { data: creatorTip } = await supabase
    .from('creator_tips')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  const { data: tipsRow } = await supabase
    .from('tips')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  let { data: tipAnalytics } = await supabase
    .from('tip_analytics')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  let creatorTipResolved = creatorTip;
  let tipsRowResolved = tipsRow;

  if (!creatorTipResolved && !tipsRowResolved) {
    const recovered = await recoverMissingTipRowsFromMetadata(paymentIntent, supabase);
    if (recovered) {
      creatorTipResolved = recovered.creatorTip as typeof creatorTip;
      tipsRowResolved = recovered.tipsRow as typeof tipsRow;
      tipAnalytics = recovered.tipAnalytics as typeof tipAnalytics;
    }
  }

  if (!creatorTipResolved && !tipsRowResolved) {
    console.error(
      '[finalizeTip] No tip rows and could not recover from metadata:',
      paymentIntentId
    );
    return { ok: false, reason: 'no_tip_rows' };
  }

  if (await tipWalletAlreadyCredited(supabase, paymentIntentId)) {
    console.log('[finalizeTip] Wallet already credited for PI (idempotent):', paymentIntentId);
    return { ok: true };
  }

  const tipData = creatorTipResolved;
  if (tipData?.id && tipData.status !== 'completed') {
    await supabase.from('creator_tips').update({ status: 'completed' }).eq('id', tipData.id);
  }

  let updatedTips = tipsRowResolved;
  if (tipsRowResolved?.id && tipsRowResolved.status !== 'completed') {
    const { data: updatedList, error: tipsUpdErr } = await supabase
      .from('tips')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId)
      .select();
    if (tipsUpdErr) {
      console.error('[finalizeTip] tips update:', tipsUpdErr);
    }
    const t = updatedList?.[0];
    if (t) updatedTips = t;
  }

  if (tipAnalytics?.id && tipAnalytics.status !== 'completed') {
    await supabase.from('tip_analytics').update({ status: 'completed' }).eq('id', tipAnalytics.id);
  }

  console.log('[finalizeTip] Crediting wallet + revenue for PI', paymentIntentId);

  const grossMinor = paymentIntent.amount ?? 0;
  const platformFeeMinor = meta.platform_fee_amount ? parseInt(meta.platform_fee_amount, 10) : Math.round(grossMinor * 0.15);
  const creatorPayoutMinor = meta.creator_payout_amount
    ? parseInt(meta.creator_payout_amount, 10)
    : grossMinor - platformFeeMinor;
  const feePct = meta.platform_fee_percent ? parseFloat(meta.platform_fee_percent) : 15;

  const creatorId =
    updatedTips?.recipient_id || tipData?.creator_id || meta.creator_user_id || meta.creatorId || null;
  const senderId = updatedTips?.sender_id || tipData?.tipper_id || meta.tipperId || null;

  if (!creatorId || !senderId) {
    console.error('[finalizeTip] Missing creator or tipper id for', paymentIntentId);
    return { ok: false, reason: 'missing_ids' };
  }

  try {
    const { error: insertPrErr } = await supabase.rpc('insert_platform_revenue', {
      p_charge_type: 'tip',
      p_gross_amount: grossMinor,
      p_platform_fee_amount: platformFeeMinor,
      p_platform_fee_percent: feePct,
      p_creator_payout_amount: creatorPayoutMinor,
      p_stripe_payment_intent_id: paymentIntentId,
      p_reference_id: paymentIntentId,
      p_creator_user_id: creatorId,
      p_currency: (paymentIntent.currency || 'usd').toUpperCase(),
    });
    if (insertPrErr) {
      console.error('[finalizeTip] insert_platform_revenue:', insertPrErr);
    }
  } catch (err) {
    console.error('[finalizeTip] insert_platform_revenue:', err);
  }

  const amount = Number(
    tipAnalytics?.tip_amount ?? updatedTips?.amount ?? tipData?.amount ?? (paymentIntent.amount ? paymentIntent.amount / 100 : 0)
  );
  const currency = String(
    updatedTips?.currency || tipData?.currency || paymentIntent.currency || 'usd'
  ).toUpperCase();
  const platformFee =
    Number(tipAnalytics?.platform_fee) || Number(meta.platformFee || meta.platform_fee || 0);

  /** Prefer Stripe PI metadata for this charge — tip_analytics rows can be wrong or cumulative. */
  let creatorEarnings = NaN;
  const metaEarningsStr = meta.creatorEarnings ?? meta.creator_earnings;
  if (metaEarningsStr !== undefined && metaEarningsStr !== null && String(metaEarningsStr).trim() !== '') {
    creatorEarnings = Number(metaEarningsStr);
  }
  if (!Number.isFinite(creatorEarnings) || creatorEarnings < 0) {
    const minor = meta.creator_payout_amount != null ? parseInt(String(meta.creator_payout_amount), 10) : NaN;
    if (Number.isFinite(minor) && minor >= 0) {
      creatorEarnings = minor / 100;
    }
  }
  if (!Number.isFinite(creatorEarnings) || creatorEarnings < 0) {
    creatorEarnings =
      Number(tipAnalytics?.creator_earnings) ||
      Number(updatedTips?.creator_earnings) ||
      Math.max(0, amount - platformFee);
  }

  const tipMessage = updatedTips?.message || tipData?.message || meta.tipMessage || '';
  const isAnonymous = Boolean(updatedTips?.is_anonymous ?? tipData?.is_anonymous ?? meta.isAnonymous === 'true');

  const { data: tipperProfile } = await supabase
    .from('profiles')
    .select('email, username, display_name')
    .eq('id', senderId)
    .maybeSingle();

  try {
    const { error: walletError } = await supabase.rpc('add_wallet_transaction', {
      user_uuid: creatorId,
      transaction_type: 'tip_received',
      amount: creatorEarnings,
      description: `Tip received${tipMessage ? `: ${tipMessage}` : ''}`,
      reference_id: paymentIntentId,
      metadata: {
        tipper_id: senderId,
        original_amount: amount,
        creator_earnings: creatorEarnings,
        platform_fee: platformFee,
        tip_message: tipMessage,
        is_anonymous: isAnonymous,
      },
      p_currency: currency,
      p_stripe_payment_intent_id: paymentIntentId,
    });
    if (walletError) {
      console.error('[finalizeTip] add_wallet_transaction:', walletError);
      return { ok: false, reason: 'wallet_failed' };
    }
  } catch (e) {
    console.error('[finalizeTip] wallet:', e);
    return { ok: false, reason: 'wallet_failed' };
  }

  try {
    await supabase.rpc('record_revenue_transaction', {
      user_uuid: creatorId,
      transaction_type_param: 'tip',
      amount_param: amount,
      customer_email_param: tipperProfile?.email || '',
      customer_name_param: tipperProfile?.display_name || tipperProfile?.username || 'Supporter',
      stripe_payment_intent_id_param: paymentIntentId,
    });
  } catch (e) {
    console.error('[finalizeTip] record_revenue_transaction:', e);
  }

  try {
    const senderProfile = tipperProfile;
    const senderUsername =
      senderProfile?.username ||
      (meta.tipperId ? String(meta.tipperId).slice(0, 8) : 'someone');
    const formattedAmount = currency === 'USD' ? `$${amount.toFixed(2)}` : `${currency} ${amount.toFixed(2)}`;

    const tipTitle = isAnonymous
      ? `Someone tipped you ${formattedAmount}`
      : senderProfile?.username
        ? `@${senderProfile.username} tipped you ${formattedAmount}`
        : `${senderProfile?.display_name || senderUsername} tipped you ${formattedAmount}`;

    const tipRowId = updatedTips?.id || tipData?.id;

    // Use the same service-role client (webhook/admin pass service client; no second createClient).
    await sendExpoPushIfAllowed(supabase, creatorId, 'tip', {
      title: tipTitle,
      body: 'Check your wallet',
      data: {
        type: 'tip',
        entityId: tipRowId ?? paymentIntentId,
        entityType: 'tip',
        creatorId: isAnonymous ? '' : senderId,
        username: senderProfile?.username ?? '',
        amount: formattedAmount,
        tipperId: isAnonymous ? 'anonymous' : senderId,
        currency,
        ...(tipRowId ? { tipId: tipRowId } : {}),
      },
      channelId: 'tips',
      priority: 'high',
    });
  } catch (e) {
    console.error('[finalizeTip] push:', e);
  }

  console.log('✅ [finalizeTip] Tip finalized for PI', paymentIntentId);
  return { ok: true };
}
