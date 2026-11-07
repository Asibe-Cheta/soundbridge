import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from '@/src/lib/stripe';
import { getPaymentIntentPaymentMethodType } from '@/src/lib/stripe-payment-intent-metadata';
import {
  isTipPaymentIntent,
  recoverMissingTipRowsFromMetadata,
  tipWalletAlreadyCredited,
} from '@/src/lib/tip-payment-intent-webhook';

export type ReconcileReason = 'stuck_pending_stripe_succeeded' | 'missing_row_recovered_from_stripe';

export type ReconcileTipResult =
  | { ok: true; skipped: true; reason: 'already_reconciled' | 'wallet_already_credited' }
  | {
      ok: true;
      skipped: false;
      reason: ReconcileReason;
      amount: number;
      currency: string;
      creatorEarnings: number;
      platformFee: number;
      creatorId: string;
    }
  | { ok: false; reason: string };

/**
 * Reconciles a single tip PaymentIntent directly against Stripe: finalizes it the
 * same way the webhook would (completes tips/creator_tips, records platform_revenue,
 * credits the creator's wallet, records the revenue transaction) but:
 *
 *  - Uses creator_earnings/platform_fee exactly as Stripe's PaymentIntent metadata
 *    recorded them for that charge (set at create-tip time), never recalculated —
 *    this is the authoritative split for that specific payment.
 *  - Is idempotent, keyed on payment_intent_id via the tip_reconciliation_log
 *    unique constraint: a PI already logged there is never credited twice, even
 *    if this function is called again or two runs overlap.
 *  - Deliberately sends NO push notification and NO thank-you DM — these are
 *    backfills of payments that may be hours or months old, not live events a
 *    creator or fan should be notified about in the moment.
 *  - Does not run track-quality-sync (sync_track_quality_from_tip) — that's a
 *    product metric, not part of crediting the creator, and out of scope here.
 *
 * Safe to call repeatedly for the same payment_intent_id.
 */
export async function reconcileTipPaymentIntent(
  paymentIntentId: string,
  supabase: SupabaseClient,
  triggeredBy: 'scheduled_job' | 'manual_admin' = 'scheduled_job',
): Promise<ReconcileTipResult> {
  if (!stripe) {
    return { ok: false, reason: 'stripe_not_configured' };
  }

  const { data: alreadyLogged } = await supabase
    .from('tip_reconciliation_log')
    .select('id')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (alreadyLogged) {
    return { ok: true, skipped: true, reason: 'already_reconciled' };
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'stripe_retrieve_failed' };
  }

  if (paymentIntent.status !== 'succeeded') {
    return { ok: false, reason: 'payment_intent_not_succeeded' };
  }
  if (!isTipPaymentIntent(paymentIntent)) {
    return { ok: false, reason: 'not_a_tip_payment_intent' };
  }

  const meta = paymentIntent.metadata || {};

  const { data: existingCreatorTip } = await supabase
    .from('creator_tips')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  const { data: existingTipsRow } = await supabase
    .from('tips')
    .select('*')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  let creatorTip = existingCreatorTip;
  let tipsRow = existingTipsRow;
  let reason: ReconcileReason = 'stuck_pending_stripe_succeeded';

  if (!creatorTip && !tipsRow) {
    reason = 'missing_row_recovered_from_stripe';
    const recovered = await recoverMissingTipRowsFromMetadata(paymentIntent, supabase);
    if (!recovered) {
      return { ok: false, reason: 'could_not_recover_rows_from_metadata' };
    }
    creatorTip = recovered.creatorTip as typeof creatorTip;
    tipsRow = recovered.tipsRow as typeof tipsRow;
  }

  if (await tipWalletAlreadyCredited(supabase, paymentIntentId)) {
    // Wallet has the money (user_wallets.balance already reflects it — confirmed
    // empirically, since wallet_transactions.status and profiles.wallet_balance
    // are both unreliable indicators here) but the tips/creator_tips rows and
    // audit log don't reflect it. Sync the rows and log the finding; never call
    // add_wallet_transaction again here — that would double-pay the creator.
    const nowIso = new Date().toISOString();
    const walletCreatorId = String(tipsRow?.recipient_id || creatorTip?.creator_id || meta.creatorId || meta.creator_id || '');
    const walletCreatorEarnings = Number(meta.creatorEarnings);
    const walletPlatformFee = Number(meta.platformFee);
    const walletAmount = Number(
      tipsRow?.amount ?? creatorTip?.amount ?? (paymentIntent.amount ? paymentIntent.amount / 100 : 0),
    );
    const walletCurrency = String(tipsRow?.currency || creatorTip?.currency || paymentIntent.currency || 'usd').toUpperCase();

    if (tipsRow?.id) {
      await supabase
        .from('tips')
        .update({
          status: 'completed',
          completed_at: nowIso,
          reconciled_at: nowIso,
          reconciled_reason: 'stuck_pending_stripe_succeeded',
        })
        .eq('id', tipsRow.id)
        .eq('status', 'pending');
    }
    if (creatorTip?.id) {
      await supabase
        .from('creator_tips')
        .update({
          status: 'completed',
          reconciled_at: nowIso,
          reconciled_reason: 'stuck_pending_stripe_succeeded',
        })
        .eq('id', creatorTip.id)
        .eq('status', 'pending');
    }

    if (walletCreatorId && Number.isFinite(walletCreatorEarnings) && Number.isFinite(walletPlatformFee)) {
      const { error: logError } = await supabase.from('tip_reconciliation_log').insert({
        payment_intent_id: paymentIntentId,
        reason: 'stuck_pending_stripe_succeeded',
        amount: walletAmount,
        currency: walletCurrency,
        creator_earnings: walletCreatorEarnings,
        platform_fee: walletPlatformFee,
        creator_id: walletCreatorId,
        triggered_by: triggeredBy,
      });
      if (logError) {
        console.error('[tip-reconciliation] audit log insert failed (wallet_already_credited path):', logError);
      }
    }

    return { ok: true, skipped: true, reason: 'wallet_already_credited' };
  }

  const creatorId = String(
    tipsRow?.recipient_id || creatorTip?.creator_id || meta.creatorId || meta.creator_id || '',
  );
  const senderId = String(tipsRow?.sender_id || creatorTip?.tipper_id || meta.tipperId || '');
  if (!creatorId || !senderId) {
    return { ok: false, reason: 'missing_creator_or_tipper_id' };
  }

  // Authoritative split: exactly what Stripe's metadata recorded for this charge
  // at create-tip time, never recalculated from today's fee policy.
  const creatorEarnings = Number(meta.creatorEarnings);
  const platformFee = Number(meta.platformFee);
  if (!Number.isFinite(creatorEarnings) || !Number.isFinite(platformFee)) {
    return { ok: false, reason: 'missing_stripe_metadata_split' };
  }

  const amount = Number(
    tipsRow?.amount ?? creatorTip?.amount ?? (paymentIntent.amount ? paymentIntent.amount / 100 : 0),
  );
  const currency = String(tipsRow?.currency || creatorTip?.currency || paymentIntent.currency || 'usd').toUpperCase();
  const nowIso = new Date().toISOString();

  if (tipsRow?.id) {
    await supabase
      .from('tips')
      .update({
        status: 'completed',
        completed_at: nowIso,
        reconciled_at: nowIso,
        reconciled_reason: reason,
      })
      .eq('id', tipsRow.id);
  }
  if (creatorTip?.id) {
    await supabase
      .from('creator_tips')
      .update({ status: 'completed', reconciled_at: nowIso, reconciled_reason: reason })
      .eq('id', creatorTip.id);
  }

  try {
    const grossMinor = paymentIntent.amount ?? 0;
    const platformFeeMinor = Math.round(platformFee * 100);
    const creatorPayoutMinor = Math.round(creatorEarnings * 100);
    const feePct = meta.platform_fee_percent ? parseFloat(String(meta.platform_fee_percent)) : 15;
    const paymentMethodType = stripe ? await getPaymentIntentPaymentMethodType(stripe, paymentIntent) : null;
    await supabase.rpc('insert_platform_revenue', {
      p_charge_type: 'tip',
      p_gross_amount: grossMinor,
      p_platform_fee_amount: platformFeeMinor,
      p_platform_fee_percent: feePct,
      p_creator_payout_amount: creatorPayoutMinor,
      p_stripe_payment_intent_id: paymentIntentId,
      p_reference_id: paymentIntentId,
      p_creator_user_id: creatorId,
      p_currency: currency,
      p_payment_method_type: paymentMethodType,
    });
  } catch (e) {
    console.error('[tip-reconciliation] insert_platform_revenue:', e);
  }

  const tipMessage = String(tipsRow?.message || creatorTip?.message || meta.tipMessage || '');

  const { error: walletError } = await supabase.rpc('add_wallet_transaction', {
    user_uuid: creatorId,
    transaction_type: 'tip_received',
    amount: creatorEarnings,
    description: `Tip received (reconciled)${tipMessage ? `: ${tipMessage}` : ''}`,
    reference_id: paymentIntentId,
    metadata: {
      tipper_id: senderId,
      original_amount: amount,
      creator_earnings: creatorEarnings,
      platform_fee: platformFee,
      tip_message: tipMessage,
      reconciled: true,
      reconciled_reason: reason,
    },
    p_currency: currency,
    p_stripe_payment_intent_id: paymentIntentId,
  });
  if (walletError) {
    console.error('[tip-reconciliation] add_wallet_transaction:', walletError);
    return { ok: false, reason: 'wallet_credit_failed' };
  }

  try {
    const { data: tipperProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', senderId)
      .maybeSingle();
    await supabase.rpc('record_revenue_transaction', {
      user_uuid: creatorId,
      transaction_type_param: 'tip',
      amount_param: amount,
      customer_email_param: tipperProfile?.email || '',
      customer_name_param: tipperProfile?.display_name?.trim() || tipperProfile?.username?.trim() || '',
      stripe_payment_intent_id_param: paymentIntentId,
    });
  } catch (e) {
    console.error('[tip-reconciliation] record_revenue_transaction:', e);
  }

  const { error: logError } = await supabase.from('tip_reconciliation_log').insert({
    payment_intent_id: paymentIntentId,
    reason,
    amount,
    currency,
    creator_earnings: creatorEarnings,
    platform_fee: platformFee,
    creator_id: creatorId,
    triggered_by: triggeredBy,
  });
  if (logError) {
    console.error('[tip-reconciliation] audit log insert failed (credit already applied):', logError);
  }

  return { ok: true, skipped: false, reason, amount, currency, creatorEarnings, platformFee, creatorId };
}

/** Finds tips stuck pending more than `olderThanMinutes` despite Stripe already having succeeded. */
export async function findStuckPendingTips(
  supabase: SupabaseClient,
  olderThanMinutes = 60,
): Promise<string[]> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('tips')
    .select('payment_intent_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .not('payment_intent_id', 'is', null);
  if (error) {
    console.error('[tip-reconciliation] findStuckPendingTips:', error.message);
    return [];
  }
  return (data || []).map((r) => r.payment_intent_id as string).filter(Boolean);
}

/**
 * Finds Stripe tip charges with no tips/creator_tips row at all, within a bounded
 * recent window (default last 25 hours) — a rolling window checked on every run
 * is cheap and self-healing, rather than re-scanning all of Stripe's history.
 */
export async function findOrphanedTipPaymentIntents(
  supabase: SupabaseClient,
  windowHours = 25,
): Promise<string[]> {
  if (!stripe) return [];

  const createdAfter = Math.floor((Date.now() - windowHours * 60 * 60 * 1000) / 1000);
  const createdBefore = Math.floor((Date.now() - 60 * 60 * 1000) / 1000); // at least 1hr old

  const charges = await stripe.charges.list({
    created: { gte: createdAfter, lte: createdBefore },
    limit: 100,
  });

  const succeededTipPIs = charges.data
    .filter((c) => c.status === 'succeeded' && c.metadata?.charge_type === 'tip' && c.payment_intent)
    .map((c) => String(c.payment_intent));

  if (succeededTipPIs.length === 0) return [];

  const [{ data: tipsRows }, { data: creatorTipsRows }] = await Promise.all([
    supabase.from('tips').select('payment_intent_id').in('payment_intent_id', succeededTipPIs),
    supabase.from('creator_tips').select('stripe_payment_intent_id').in('stripe_payment_intent_id', succeededTipPIs),
  ]);

  const covered = new Set([
    ...(tipsRows || []).map((r: any) => r.payment_intent_id),
    ...(creatorTipsRows || []).map((r: any) => r.stripe_payment_intent_id),
  ]);

  return succeededTipPIs.filter((pi) => !covered.has(pi));
}
