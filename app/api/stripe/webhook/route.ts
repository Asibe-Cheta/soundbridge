import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !stripe) {
      return NextResponse.json(
        { error: 'Missing signature or Stripe not configured' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('Payment succeeded:', paymentIntent.id);

      // Update tip status to completed
      const { error: tipError } = await supabase
        .from('creator_tips')
        .update({ status: 'completed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (tipError) {
        console.error('Error updating tip status:', tipError);
      }

      // Update tip analytics
      const { error: analyticsError } = await supabase
        .from('tip_analytics')
        .update({ status: 'completed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (analyticsError) {
        console.error('Error updating tip analytics:', analyticsError);
      }

      // Record revenue transaction
      if (paymentIntent.metadata.creatorId && paymentIntent.metadata.tipperId) {
        const { error: transactionError } = await supabase
          .rpc('record_revenue_transaction', {
            user_uuid: paymentIntent.metadata.creatorId,
            transaction_type_param: 'tip',
            amount_param: parseFloat(paymentIntent.metadata.creatorEarnings || '0'),
            customer_email_param: '', // Will be filled from user data if needed
            customer_name_param: paymentIntent.metadata.isAnonymous === 'true' ? 'Anonymous' : 'Tipper',
            stripe_payment_intent_id_param: paymentIntent.id
          });

        if (transactionError) {
          console.error('Error recording revenue transaction:', transactionError);
        }
      }

      return NextResponse.json({ received: true });
    }

    // Handle failed payment
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('Payment failed:', paymentIntent.id);

      // Update tip status to failed
      const { error: tipError } = await supabase
        .from('creator_tips')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (tipError) {
        console.error('Error updating tip status:', tipError);
      }

      // Update tip analytics
      const { error: analyticsError } = await supabase
        .from('tip_analytics')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (analyticsError) {
        console.error('Error updating tip analytics:', analyticsError);
      }

      return NextResponse.json({ received: true });
    }

    // Handle other events
    console.log(`Unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}