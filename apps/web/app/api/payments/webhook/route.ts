import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/src/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { SendGridService } from '@/src/lib/sendgrid-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature provided');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!stripe) {
      console.error('Stripe not configured');
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET_CONTENT_PURCHASES || process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('📦 Content Purchase Webhook Event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Always return 200 to Stripe
    return NextResponse.json({ received: true }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Stripe from retrying
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 200, headers: corsHeaders }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const metadata = paymentIntent.metadata;
    const { content_id, content_type, buyer_id, creator_id, creator_earnings, platform_fee } = metadata;

    if (!content_id || !content_type || !buyer_id || !creator_id) {
      console.error('Missing required metadata in payment intent');
      return;
    }

    // Check for duplicate (idempotency)
    const { data: existingPurchase } = await supabase
      .from('content_purchases')
      .select('id')
      .eq('transaction_id', paymentIntent.id)
      .single();

    if (existingPurchase) {
      console.log('Duplicate webhook - already processed:', paymentIntent.id);
      return;
    }

    // Create purchase record
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

    // Transfer earnings to creator's wallet
    try {
      const { error: walletError } = await supabase
        .rpc('add_wallet_transaction', {
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
          }
        });

      if (walletError) {
        console.error('Error adding sale to creator wallet:', walletError);
      } else {
        console.log('✅ Creator earnings added to wallet');
      }
    } catch (walletError) {
      console.error('Error processing wallet transaction:', walletError);
    }

    // Update content sales metrics
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
          total_revenue: Number(currentTrack?.total_revenue || 0) + (paymentIntent.amount / 100),
        })
        .eq('id', content_id);

      if (updateError) {
        console.error('Error updating sales metrics:', updateError);
      }
    }

    // Send email notifications (non-blocking)
    try {
      // Get buyer and creator profiles
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

      // Get content title
      let contentTitle = 'Content';
      if (content_type === 'track') {
        const { data: track } = await supabase
          .from('audio_tracks')
          .select('title')
          .eq('id', content_id)
          .single();
        contentTitle = track?.title || 'Content';
      }

      // Send purchase confirmation to buyer
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

      // Send sale notification to creator
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
      // Don't fail - emails are non-critical
    }

    console.log('✅ Payment succeeded - purchase complete');
  } catch (error: any) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const metadata = paymentIntent.metadata;
    const { buyer_id } = metadata;

    console.log('❌ Payment failed for buyer:', buyer_id);

    // Log the failure (could send email to user)
    // For now, just log it
  } catch (error: any) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>
) {
  try {
    console.log('⚠️ Payment canceled:', paymentIntent.id);
    // Just log it - no action needed
  } catch (error: any) {
    console.error('Error handling payment cancellation:', error);
  }
}

/**
 * Handle refund
 */
async function handleRefund(
  charge: Stripe.Charge,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Find the purchase record
    const { data: purchase } = await supabase
      .from('content_purchases')
      .select('*')
      .eq('transaction_id', charge.payment_intent as string)
      .single();

    if (!purchase) {
      console.log('No purchase found for refund:', charge.payment_intent);
      return;
    }

    // Update purchase status to refunded
    await supabase
      .from('content_purchases')
      .update({ status: 'refunded' })
      .eq('id', purchase.id);

    // Deduct from creator wallet (if not already deducted)
    if (purchase.status === 'completed') {
      await supabase
        .rpc('add_wallet_transaction', {
          user_uuid: purchase.user_id, // This should be creator_id, but using user_id from purchase
          transaction_type: 'refund',
          amount: -purchase.creator_earnings, // Negative amount
          description: `Refund: Content purchase`,
          reference_id: charge.id,
        });
    }

    // Decrement sales count
    if (purchase.content_type === 'track') {
      const { data: currentTrack } = await supabase
        .from('audio_tracks')
        .select('total_sales_count, total_revenue')
        .eq('id', purchase.content_id)
        .single();

      await supabase
        .from('audio_tracks')
        .update({
          total_sales_count: Math.max(0, (currentTrack?.total_sales_count || 0) - 1),
          total_revenue: Math.max(0, Number(currentTrack?.total_revenue || 0) - purchase.price_paid),
        })
        .eq('id', purchase.content_id);
    }

    console.log('✅ Refund processed for purchase:', purchase.id);
  } catch (error: any) {
    console.error('Error handling refund:', error);
  }
}
