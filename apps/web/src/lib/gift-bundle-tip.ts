/**
 * Gift Bundle tip path (WEB_TEAM_GIFT_BUNDLE.MD, Item 36) — pays a tip out of the
 * fan's prepaid Gift Bundle balance instead of a fresh Stripe charge. No
 * PaymentIntent exists for this path, so this function is the complete,
 * synchronous equivalent of create-tip + confirm-tip + the webhook's finalize
 * step combined — there is nothing for mobile to confirm afterward.
 *
 * Credits the creator identically to a card tip: same tables (tips,
 * creator_tips, tip_analytics), same add_wallet_transaction RPC and 85/15
 * split, same push + thank-you DM. debit_gift_bundle runs first so a tip
 * record is never created for a balance that was actually insufficient.
 */
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { PLATFORM_FEE_DECIMAL, PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';
import { sendTipThankYouDm } from '@/src/lib/tip-thank-you-dm';

export async function handleGiftBundleTip(params: {
  service: SupabaseClient;
  user: User;
  creatorId: string;
  amount: number; // major units
  message?: string | null;
  isAnonymous?: boolean;
  trackId?: string | null;
  liveStreamId?: string | null;
  corsHeaders: Record<string, string>;
}) {
  const { service, user, creatorId, amount, message, isAnonymous, trackId, liveStreamId, corsHeaders } = params;

  const tipAmount = Number(amount);
  if (!(tipAmount > 0)) {
    return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400, headers: corsHeaders });
  }

  const platformFee = Math.round(tipAmount * PLATFORM_FEE_DECIMAL * 100) / 100;
  const creatorEarnings = Math.round((tipAmount - platformFee) * 100) / 100;
  const amountMinor = Math.round(tipAmount * 100);
  const tipId = crypto.randomUUID();

  // Debit first — if the balance is insufficient, nothing else gets created.
  let newBalanceMinor: number;
  try {
    const { data, error } = await service.rpc('debit_gift_bundle', {
      p_user_id: user.id,
      p_amount: amountMinor,
      p_tip_id: tipId,
    });
    if (error) throw error;
    newBalanceMinor = data as number;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('insufficient_gift_bundle_balance')) {
      return NextResponse.json(
        { success: false, error: "Your Gift Bundle balance isn't enough for this tip." },
        { status: 400, headers: corsHeaders },
      );
    }
    console.error('[gift-bundle-tip] debit_gift_bundle failed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process Gift Bundle tip' },
      { status: 500, headers: corsHeaders },
    );
  }

  const nowIso = new Date().toISOString();

  const { error: tipsError } = await service.from('tips').insert({
    id: tipId,
    sender_id: user.id,
    recipient_id: creatorId,
    amount: tipAmount,
    currency: 'USD',
    message: message || null,
    is_anonymous: isAnonymous || false,
    status: 'completed',
    payment_intent_id: null,
    platform_fee: platformFee,
    creator_earnings: creatorEarnings,
    completed_at: nowIso,
    ...(trackId ? { track_id: trackId } : {}),
    ...(liveStreamId ? { live_stream_id: liveStreamId } : {}),
  });
  if (tipsError) {
    // Balance is already debited and audited in gift_bundle_transactions regardless —
    // log loudly rather than fail the request, matching create-tip's own tolerance
    // for the secondary tables (tip_analytics/creator_tips) failing non-fatally.
    console.error('[gift-bundle-tip] tips insert failed:', tipsError);
  }

  const { error: legacyTipError } = await service.from('creator_tips').insert({
    creator_id: creatorId,
    tipper_id: user.id,
    amount: tipAmount,
    currency: 'USD',
    message: message || null,
    is_anonymous: isAnonymous || false,
    stripe_payment_intent_id: null,
    status: 'completed',
    ...(liveStreamId ? { live_stream_id: liveStreamId } : {}),
  });
  if (legacyTipError) {
    console.error('[gift-bundle-tip] creator_tips insert failed:', legacyTipError);
  }

  const { error: analyticsError } = await service.from('tip_analytics').insert({
    creator_id: creatorId,
    tipper_id: user.id,
    tipper_tier: 'free',
    tip_amount: tipAmount,
    platform_fee: platformFee,
    creator_earnings: creatorEarnings,
    fee_percentage: PLATFORM_FEE_PERCENT,
    tip_message: message || null,
    is_anonymous: isAnonymous || false,
    stripe_payment_intent_id: null,
    status: 'completed',
  });
  if (analyticsError) {
    console.warn('[gift-bundle-tip] tip_analytics insert failed (non-blocking):', analyticsError);
  }

  // Credit the creator identically to a card tip — same RPC, same split.
  const { error: walletError } = await service.rpc('add_wallet_transaction', {
    user_uuid: creatorId,
    transaction_type: 'tip_received',
    amount: creatorEarnings,
    description: `Tip received${message ? `: ${message}` : ''}`,
    reference_id: tipId,
    metadata: {
      tipper_id: user.id,
      original_amount: tipAmount,
      creator_earnings: creatorEarnings,
      platform_fee: platformFee,
      tip_message: message || '',
      is_anonymous: isAnonymous || false,
      paid_from_gift_bundle: true,
    },
    p_currency: 'USD',
    p_stripe_payment_intent_id: null,
  });
  if (walletError) {
    console.error('[gift-bundle-tip] add_wallet_transaction failed:', walletError);
    return NextResponse.json(
      { success: false, error: 'Failed to complete tip' },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    const { data: tipperProfile } = await service
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle();
    const formattedAmount = `$${tipAmount.toFixed(2)}`;
    const displayName = tipperProfile?.display_name?.trim() || tipperProfile?.username?.trim() || 'Someone';
    const tipTitle = isAnonymous
      ? `Someone tipped you ${formattedAmount}`
      : `${displayName} tipped you ${formattedAmount}`;
    await sendExpoPushIfAllowed(service, creatorId, 'tip', {
      title: tipTitle,
      body: 'Check your wallet',
      data: {
        type: 'tip',
        entityId: tipId,
        entityType: 'tip',
        creatorId: isAnonymous ? '' : user.id,
        username: isAnonymous ? '' : (tipperProfile?.username?.replace(/^@/, '') || ''),
        amount: formattedAmount,
        tipperId: isAnonymous ? 'anonymous' : user.id,
        currency: 'USD',
        tipId,
      },
      channelId: 'tips',
      priority: 'high',
    });
  } catch (e) {
    console.error('[gift-bundle-tip] push failed:', e);
  }

  try {
    await sendTipThankYouDm(service, {
      creatorId,
      tipperId: user.id,
      paymentIntentId: tipId,
      isAnonymous: !!isAnonymous,
      tipRowId: tipId,
    });
  } catch (e) {
    console.error('[gift-bundle-tip] thank-you DM failed:', e);
  }

  return NextResponse.json(
    {
      success: true,
      tipId,
      platformFee,
      creatorEarnings,
      paidFromGiftBundle: true,
      newGiftBundleBalance: newBalanceMinor / 100,
    },
    { headers: corsHeaders },
  );
}
