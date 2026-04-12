import type Stripe from 'stripe';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { SendGridService } from '@/src/lib/sendgrid-service';
import { CREATOR_SHARE_DECIMAL, PLATFORM_FEE_DECIMAL, PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';
import { notifyCreatorContentPurchasePush } from '@/src/lib/content-purchase-push';

export type FinalizeResult =
  | { ok: true; purchase: Record<string, unknown>; alreadyCompleted?: boolean }
  | { ok: false; status: number; message: string };

/**
 * Persist purchase / wallet / metrics / emails after a succeeded PaymentIntent
 * (e.g. Stripe Elements + create-intent). Idempotent on transaction_id.
 */
export async function finalizeContentPurchaseFromPaymentIntent(
  supabase: SupabaseClient,
  user: User,
  paymentIntent: Stripe.PaymentIntent
): Promise<FinalizeResult> {
  const md = paymentIntent.metadata || {};
  const buyerId = md.buyer_id;
  const contentId = md.content_id;
  const contentType = md.content_type;

  if (!buyerId || !contentId || !contentType) {
    return { ok: false, status: 400, message: 'Invalid payment metadata' };
  }

  if (buyerId !== user.id) {
    return { ok: false, status: 403, message: 'This payment belongs to another account' };
  }

  if (contentType !== 'track' && contentType !== 'album') {
    return { ok: false, status: 400, message: 'Unsupported content type' };
  }

  const { data: existingByPi } = await supabase
    .from('content_purchases')
    .select('id, user_id, content_id, content_type, price_paid, currency, platform_fee, creator_earnings, transaction_id, status, purchased_at, download_count')
    .eq('transaction_id', paymentIntent.id)
    .maybeSingle();

  if (existingByPi) {
    return {
      ok: true,
      alreadyCompleted: true,
      purchase: existingByPi as unknown as Record<string, unknown>,
    };
  }

  const { data: existingOwn } = await supabase
    .from('content_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .eq('status', 'completed')
    .maybeSingle();

  if (existingOwn) {
    return { ok: false, status: 400, message: 'You already own this content' };
  }

  let content: { title?: string; creator_id: string; price: number; currency: string } | null = null;

  if (contentType === 'track') {
    const { data: track, error } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id, is_paid, price, currency')
      .eq('id', contentId)
      .single();
    if (error || !track || !track.is_paid) {
      return { ok: false, status: 400, message: 'Content not available for purchase' };
    }
    content = {
      title: track.title,
      creator_id: track.creator_id,
      price: Number(track.price),
      currency: track.currency || 'USD',
    };
  } else {
    const { data: album, error } = await supabase
      .from('albums')
      .select('id, title, creator_id, is_paid, price, currency')
      .eq('id', contentId)
      .single();
    if (error || !album || !album.is_paid) {
      return { ok: false, status: 400, message: 'Content not available for purchase' };
    }
    content = {
      title: album.title,
      creator_id: album.creator_id,
      price: Number(album.price),
      currency: album.currency || 'USD',
    };
  }

  if (content.creator_id === user.id) {
    return { ok: false, status: 400, message: 'You cannot purchase your own content' };
  }

  const price = content.price;
  const currency = content.currency;
  const amountCents = Math.round(price * 100);
  if (paymentIntent.amount !== amountCents) {
    return { ok: false, status: 400, message: 'Payment amount does not match listing price' };
  }
  if (paymentIntent.currency.toUpperCase() !== currency.toUpperCase()) {
    return { ok: false, status: 400, message: 'Currency mismatch' };
  }

  const platformFee = Math.round(price * PLATFORM_FEE_DECIMAL * 100) / 100;
  const creatorEarnings = Math.round(price * CREATOR_SHARE_DECIMAL * 100) / 100;
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_DECIMAL);
  const platformRevenueChargeType = contentType === 'album' ? 'album_sale' : 'audio_sale';

  const { data: purchase, error: purchaseError } = await supabase
    .from('content_purchases')
    .insert({
      user_id: user.id,
      content_id: contentId,
      content_type: contentType,
      price_paid: price,
      currency: currency,
      platform_fee: platformFee,
      creator_earnings: creatorEarnings,
      transaction_id: paymentIntent.id,
      status: 'completed',
    })
    .select()
    .single();

  if (purchaseError || !purchase) {
    console.error('[finalizeContentPurchase] insert purchase:', purchaseError);
    return { ok: false, status: 500, message: 'Could not record purchase. Contact support if you were charged.' };
  }

  await supabase
    .rpc('insert_platform_revenue', {
      p_charge_type: platformRevenueChargeType,
      p_gross_amount: amountCents,
      p_platform_fee_amount: platformFeeCents,
      p_platform_fee_percent: PLATFORM_FEE_PERCENT,
      p_creator_payout_amount: amountCents - platformFeeCents,
      p_stripe_payment_intent_id: paymentIntent.id,
      p_reference_id: contentId,
      p_creator_user_id: content.creator_id,
      p_currency: currency.toUpperCase(),
    })
    .catch((err) => console.error('[finalizeContentPurchase] insert_platform_revenue:', err));

  try {
    await supabase.rpc('add_wallet_transaction', {
      user_uuid: content.creator_id,
      transaction_type: 'content_sale',
      amount: creatorEarnings,
      description: `Sale: ${content.title || 'Content'}`,
      reference_id: paymentIntent.id,
      metadata: {
        content_id: contentId,
        content_type: contentType,
        buyer_id: user.id,
        buyer_username: user.user_metadata?.username || user.email,
        original_price: price,
        platform_fee: platformFee,
      },
      p_currency: currency.toUpperCase(),
      p_stripe_payment_intent_id: paymentIntent.id,
    });
  } catch (e) {
    console.error('[finalizeContentPurchase] wallet:', e);
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
        total_revenue: Number(currentTrack?.total_revenue || 0) + price,
      })
      .eq('id', contentId);
  } else {
    const { data: currentAlbum } = await supabase
      .from('albums')
      .select('total_sales_count, total_revenue')
      .eq('id', contentId)
      .single();
    await supabase
      .from('albums')
      .update({
        total_sales_count: (currentAlbum?.total_sales_count || 0) + 1,
        total_revenue: Number(currentAlbum?.total_revenue || 0) + price,
      })
      .eq('id', contentId);
  }

  try {
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', user.id)
      .single();

    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', content.creator_id)
      .single();

    if (buyerProfile?.email) {
      await SendGridService.sendPurchaseConfirmationEmail({
        to: buyerProfile.email,
        userName: buyerProfile.display_name || buyerProfile.username || 'User',
        contentTitle: content.title || 'Content',
        creatorName: creatorProfile?.display_name || creatorProfile?.username || 'Creator',
        pricePaid: price,
        currency: currency,
        transactionId: paymentIntent.id,
        purchaseDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        libraryUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/user/purchases`,
      });
    }

    if (creatorProfile?.email) {
      await SendGridService.sendSaleNotificationEmail({
        to: creatorProfile.email,
        creatorName: creatorProfile.display_name || creatorProfile.username || 'Creator',
        contentTitle: content.title || 'Content',
        buyerUsername: buyerProfile?.username || 'User',
        amountEarned: creatorEarnings,
        currency: currency,
        analyticsUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/creator/sales`,
      });
    }
  } catch (emailError) {
    console.error('[finalizeContentPurchase] email:', emailError);
  }

  void notifyCreatorContentPurchasePush({
    creatorId: content.creator_id,
    buyerId: user.id,
    contentId,
    contentType,
    title: content.title || 'Content',
    amount: price,
    currency,
  });

  return { ok: true, purchase: purchase as unknown as Record<string, unknown> };
}
