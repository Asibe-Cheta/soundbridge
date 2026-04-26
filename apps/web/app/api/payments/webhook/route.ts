import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/src/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { recordContentSaleFromPaymentIntent } from '@/src/lib/content-purchase-payment-intent-webhook';
import { finalizeTipFromSucceededPaymentIntent } from '@/src/lib/tip-payment-intent-webhook';
import { finalizeRequestRoomFromSucceededPaymentIntent } from '@/src/lib/request-room-payment-intent-webhook';

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
      case 'payment_intent.amount_capturable_updated':
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

async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>
) {
  try {
    await finalizeTipFromSucceededPaymentIntent(paymentIntent, supabase);
    await finalizeRequestRoomFromSucceededPaymentIntent(paymentIntent, supabase);
    await recordContentSaleFromPaymentIntent(paymentIntent, supabase);
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
          p_currency: String(purchase.currency || 'USD').toUpperCase(),
          p_stripe_payment_intent_id: String(charge.payment_intent ?? ''),
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
