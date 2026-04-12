import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SendGridService } from '@/src/lib/sendgrid-service';
import { notifyCreatorContentPurchasePush } from '@/src/lib/content-purchase-push';

/**
 * PaymentIntents from POST /api/payments/create-intent set charge_type to audio_sale or album_sale.
 * If Stripe Dashboard only sends events to /api/stripe/webhook (not /api/payments/webhook),
 * those purchases must still be recorded — use this helper from the main webhook too.
 */
export function isContentSalePaymentIntent(pi: Stripe.PaymentIntent): boolean {
  const m = pi.metadata || {};
  return (
    (m.charge_type === 'audio_sale' || m.charge_type === 'album_sale') &&
    typeof m.content_id === 'string' &&
    typeof m.buyer_id === 'string' &&
    typeof m.creator_id === 'string'
  );
}

/**
 * Idempotent on paymentIntent.id (transaction_id). Used by /api/payments/webhook and /api/stripe/webhook.
 */
export async function recordContentSaleFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  supabase: SupabaseClient
): Promise<void> {
  const metadata = paymentIntent.metadata || {};

  if (metadata.gig_source === 'urgent') {
    const { runUrgentGigMatching } = await import('@/src/lib/urgent-gig-matching');
    const result = await runUrgentGigMatching(supabase, paymentIntent.id);
    if (result) console.log('Urgent gig matching done:', result.gigId, 'matched:', result.matchedCount);
    return;
  }

  if (metadata.charge_type === 'tip') {
    return;
  }

  const { content_id, content_type, buyer_id, creator_id, creator_earnings, platform_fee } = metadata;

  if (!content_id || !content_type || !buyer_id || !creator_id) {
    return;
  }

  const { data: existingPurchase } = await supabase
    .from('content_purchases')
    .select('id')
    .eq('transaction_id', paymentIntent.id)
    .maybeSingle();

  if (existingPurchase) {
    console.log('Duplicate webhook - already processed:', paymentIntent.id);
    return;
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from('content_purchases')
    .insert({
      user_id: buyer_id,
      content_id: content_id,
      content_type: content_type,
      price_paid: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      platform_fee: parseFloat(platform_fee || '0'),
      creator_earnings: parseFloat(creator_earnings || '0'),
      transaction_id: paymentIntent.id,
      status: 'completed',
    })
    .select()
    .single();

  if (purchaseError) {
    console.error('Error creating purchase record:', purchaseError);
    return;
  }

  console.log('✅ Purchase record created:', purchase.id);

  try {
    const { error: walletError } = await supabase.rpc('add_wallet_transaction', {
      user_uuid: creator_id,
      transaction_type: 'content_sale',
      amount: parseFloat(creator_earnings || '0'),
      description: `Sale: Content purchase`,
      reference_id: paymentIntent.id,
      metadata: {
        content_id: content_id,
        content_type: content_type,
        buyer_id: buyer_id,
        original_price: paymentIntent.amount / 100,
        platform_fee: parseFloat(platform_fee || '0'),
      },
    });

    if (walletError) {
      console.error('Error adding sale to creator wallet:', walletError);
    } else {
      console.log('✅ Creator earnings added to wallet');
    }
  } catch (walletError) {
    console.error('Error processing wallet transaction:', walletError);
  }

  if (content_type === 'track') {
    const { data: currentTrack } = await supabase
      .from('audio_tracks')
      .select('total_sales_count, total_revenue')
      .eq('id', content_id)
      .single();

    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update({
        total_sales_count: (currentTrack?.total_sales_count || 0) + 1,
        total_revenue: Number(currentTrack?.total_revenue || 0) + paymentIntent.amount / 100,
      })
      .eq('id', content_id);

    if (updateError) {
      console.error('Error updating sales metrics:', updateError);
    }
  } else if (content_type === 'album') {
    const { data: currentAlbum } = await supabase
      .from('albums')
      .select('total_sales_count, total_revenue')
      .eq('id', content_id)
      .single();

    const { error: albumUpdateError } = await supabase
      .from('albums')
      .update({
        total_sales_count: (currentAlbum?.total_sales_count || 0) + 1,
        total_revenue: Number(currentAlbum?.total_revenue || 0) + paymentIntent.amount / 100,
      })
      .eq('id', content_id);

    if (albumUpdateError) {
      console.error('Error updating album sales metrics:', albumUpdateError);
    }
  }

  let contentTitle = 'Content';
  if (content_type === 'track') {
    const { data: track } = await supabase.from('audio_tracks').select('title').eq('id', content_id).single();
    contentTitle = track?.title || 'Content';
  } else if (content_type === 'album') {
    const { data: album } = await supabase.from('albums').select('title').eq('id', content_id).single();
    contentTitle = album?.title || 'Content';
  }

  try {
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', buyer_id)
      .single();

    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('email, username, display_name')
      .eq('id', creator_id)
      .single();

    if (buyerProfile?.email) {
      await SendGridService.sendPurchaseConfirmationEmail({
        to: buyerProfile.email,
        userName: buyerProfile.display_name || buyerProfile.username || 'User',
        contentTitle: contentTitle,
        creatorName: creatorProfile?.display_name || creatorProfile?.username || 'Creator',
        pricePaid: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
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
        contentTitle: contentTitle,
        buyerUsername: buyerProfile?.username || 'User',
        amountEarned: parseFloat(creator_earnings || '0'),
        currency: paymentIntent.currency.toUpperCase(),
        analyticsUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/creator/sales`,
      });
    }
  } catch (emailError) {
    console.error('Error sending email notifications:', emailError);
  }

  void notifyCreatorContentPurchasePush({
    creatorId: creator_id,
    buyerId: buyer_id,
    contentId: content_id,
    contentType: content_type,
    title: contentTitle,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency.toUpperCase(),
  });

  console.log('✅ Payment succeeded - purchase complete');
}
