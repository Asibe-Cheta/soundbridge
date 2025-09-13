import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '../../../../src/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

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
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const supabase = createServerComponentClient({ cookies });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabase);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const billingCycle = session.metadata?.billingCycle;

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Update user subscription in database
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      tier: plan,
      status: 'active',
      billing_cycle: billingCycle,
      stripe_subscription_id: session.subscription,
      stripe_customer_id: session.customer,
      subscription_ends_at: null, // Active subscription
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription created for user ${userId}: ${plan} (${billingCycle})`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  const userId = subscription.metadata?.userId;
  const plan = subscription.metadata?.plan;
  const billingCycle = subscription.metadata?.billingCycle;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  const status = subscription.status === 'active' ? 'active' : 'cancelled';
  const subscriptionEndsAt = subscription.cancel_at 
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status,
      billing_cycle: billingCycle,
      subscription_ends_at: subscriptionEndsAt,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription updated for user ${userId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      subscription_ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }

  console.log(`Subscription cancelled: ${subscription.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
  // You can add additional logic here, like sending confirmation emails
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  console.log(`Payment failed for invoice: ${invoice.id}`);
  // You can add additional logic here, like sending payment failure notifications
}
