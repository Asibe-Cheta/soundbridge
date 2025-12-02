import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../../../../src/lib/stripe';
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  // Check Stripe is configured
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        console.log('🔄 Stripe account updated:', account.id, 'charges_enabled:', account.charges_enabled);
        
        // Update database with new account status
        const { error: updateError } = await (supabase
          .from('creator_bank_accounts') as any)
          .update({
            verification_status: account.charges_enabled ? 'verified' : 'pending',
            is_verified: account.charges_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);

        if (updateError) {
          console.error('Error updating account status:', updateError);
        } else {
          console.log('✅ Account status updated in database');
        }
        break;

      case 'account.application.deauthorized':
        const deauthAccount = event.data.object;
        console.log('🚫 Account deauthorized:', deauthAccount.id);
        
        // Mark account as deauthorized
        await (supabase
          .from('creator_bank_accounts') as any)
          .update({
            verification_status: 'deauthorized',
            is_verified: false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', deauthAccount.id);
        break;

      // Subscription events for tier restructure
      case 'checkout.session.completed':
        const session = event.data.object as any;
        if (session.mode === 'subscription' && session.metadata?.userId) {
          await handleSubscriptionCreated(session, supabase);
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription, supabase);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as any;
        await handleSubscriptionDeleted(deletedSubscription, supabase);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await handlePaymentSucceeded(invoice, supabase);
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as any;
        if (failedInvoice.subscription) {
          await handlePaymentFailed(failedInvoice, supabase);
        }
        break;

      case 'charge.refunded':
        const charge = event.data.object as any;
        await handleRefundProcessed(charge, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Subscription event handlers for tier restructure

async function handleSubscriptionCreated(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const userId = session.metadata?.userId;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId || !subscriptionId) {
      console.error('Missing userId or subscriptionId in session metadata');
      return;
    }

    // Get subscription details from Stripe
    if (!stripe) return;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    
    // Determine tier and billing cycle from price ID
    const isPro = priceId?.includes('pro') || false;
    const isYearly = priceId?.includes('yearly') || false;
    const tier = isPro ? 'pro' : 'free'; // Only Pro or Free tiers supported
    const billingCycle = isYearly ? 'yearly' : 'monthly';

    const now = new Date();
    const subscriptionStartDate = new Date(subscription.current_period_start * 1000);
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const renewalDate = new Date(subscriptionEndDate);

    // Cancel any existing active subscription
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Create new subscription
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        tier,
        status: 'active',
        billing_cycle: billingCycle,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_renewal_date: renewalDate.toISOString(),
        subscription_ends_at: subscriptionEndDate.toISOString(),
        money_back_guarantee_eligible: true,
        refund_count: 0
      });

    if (subError) {
      console.error('Error creating subscription:', subError);
    } else {
      console.log(`✅ Subscription created: ${tier} ${billingCycle} for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = subscription.id;
    const customerId = subscription.customer as string;

    // Find user by Stripe customer ID
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('Subscription not found in database:', subscriptionId);
      return;
    }

    const subscriptionStartDate = new Date(subscription.current_period_start * 1000);
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);

    // Update subscription
    await supabase
      .from('user_subscriptions')
      .update({
        subscription_renewal_date: subscriptionEndDate.toISOString(),
        subscription_ends_at: subscriptionEndDate.toISOString(),
        status: subscription.status === 'active' ? 'active' : 
                subscription.status === 'canceled' ? 'cancelled' : 
                subscription.status === 'past_due' ? 'past_due' : 'expired'
      })
      .eq('stripe_subscription_id', subscriptionId);

    console.log(`✅ Subscription updated: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = subscription.id;

    // Update subscription status
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        subscription_ends_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    console.log(`✅ Subscription cancelled: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    // Update subscription renewal date
    if (subscriptionId && invoice.period_end) {
      const renewalDate = new Date(invoice.period_end * 1000);
      
      await supabase
        .from('user_subscriptions')
        .update({
          subscription_renewal_date: renewalDate.toISOString(),
          subscription_ends_at: renewalDate.toISOString(),
          status: 'active'
        })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`✅ Payment succeeded, subscription renewed: ${subscriptionId}`);
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    if (subscriptionId) {
      // Mark as past_due and start grace period
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due'
        })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`⚠️ Payment failed, subscription marked as past_due: ${subscriptionId}`);
      
      // Note: Grace period handling (7 days) should be done via cron job
      // that checks past_due subscriptions and downgrades after 7 days
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handleRefundProcessed(
  charge: Stripe.Charge,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Find refund record by payment intent
    const paymentIntentId = charge.payment_intent as string;
    
    if (paymentIntentId) {
      // Update refund record if exists
      const { data: refunds } = await supabase
        .from('refunds')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .limit(1);

      if (refunds && refunds.length > 0) {
        await supabase
          .from('refunds')
          .update({
            stripe_refund_id: charge.refunds?.data[0]?.id || null,
            refund_date: new Date().toISOString()
          })
          .eq('id', refunds[0].id);

        console.log(`✅ Refund processed: ${charge.id}`);
      }
    }
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}