import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../../../../src/lib/stripe';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { SubscriptionEmailService } from '../../../../src/services/SubscriptionEmailService';

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
        if (session.mode === 'subscription' && (session.metadata?.user_id || session.metadata?.userId)) {
          await handleCheckoutCompleted(session, supabase);
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

// Subscription event handlers - Updated to use upsert

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Support both user_id (new) and userId (old) for backward compatibility
    const userId = session.metadata?.user_id || session.metadata?.userId;
    const billingCycle = session.metadata?.billing_cycle || 'monthly';
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId || !subscriptionId) {
      console.error('[webhook] Missing user_id or subscription_id in session metadata');
      return;
    }

    // Get subscription details from Stripe
    if (!stripe) {
      console.error('[webhook] Stripe not configured');
      return;
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const now = new Date();
    const subscriptionStartDate = new Date(subscription.current_period_start * 1000);
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const guaranteeEndDate = new Date(subscriptionStartDate);
    guaranteeEndDate.setDate(guaranteeEndDate.getDate() + 7);

    console.log('[webhook] Updating subscription for user:', userId);

    // Use upsert (INSERT with ON CONFLICT) to avoid UPDATE RLS issues
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id: userId,
          tier: 'pro',
          status: 'active',
          billing_cycle: billingCycle,
          stripe_customer_id: customerId as string,
          stripe_subscription_id: subscriptionId,
          subscription_start_date: subscriptionStartDate.toISOString(),
          subscription_renewal_date: subscriptionEndDate.toISOString(),
          subscription_ends_at: subscriptionEndDate.toISOString(),
          money_back_guarantee_end_date: guaranteeEndDate.toISOString(),
          money_back_guarantee_eligible: true,
          refund_count: 0,
          updated_at: now.toISOString(),
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('[webhook] Error updating subscription:', error);
    } else {
      console.log('[webhook] Successfully updated subscription for user:', userId);
      
      // Send subscription confirmation email
      const userInfo = await SubscriptionEmailService.getUserInfo(userId);
      if (userInfo && userInfo.email) {
        const amount = billingCycle === 'monthly' ? '£9.99' : '£99.00';
        
        await SubscriptionEmailService.sendSubscriptionConfirmation({
          userEmail: userInfo.email,
          userName: userInfo.name,
          billingCycle,
          amount,
          currency: 'GBP',
          subscriptionStartDate: subscriptionStartDate.toISOString(),
          nextBillingDate: subscriptionEndDate.toISOString(),
          invoiceUrl: session.invoice_url || undefined
        });
      }
    }

  } catch (error) {
    console.error('[webhook] Error in handleCheckoutCompleted:', error);
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = subscription.id;
    
    // Find user by subscription ID (more reliable than metadata)
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found in database:', subscriptionId);
      return;
    }

    const userId = existingSub.user_id;
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const status = subscription.status === 'active' ? 'active' : 
                   subscription.status === 'canceled' ? 'cancelled' : 
                   subscription.status === 'past_due' ? 'past_due' : 'expired';

    console.log('[webhook] Updating subscription status for user:', userId);

    // Use upsert to avoid UPDATE RLS issues
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id: userId,
          subscription_renewal_date: subscriptionEndDate.toISOString(),
          subscription_ends_at: subscriptionEndDate.toISOString(),
          status,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('[webhook] Error updating subscription:', error);
    } else {
      console.log('[webhook] Successfully updated subscription status');
    }

  } catch (error) {
    console.error('[webhook] Error in handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = subscription.id;

    // Find user by subscription ID
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found for deletion:', subscriptionId);
      return;
    }

    const userId = existingSub.user_id;

    // Downgrade to free tier
    await supabase
      .from('user_subscriptions')
      .update({
        tier: 'free',
        status: 'cancelled',
        subscription_ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    console.log(`✅ Subscription cancelled and downgraded to free: ${subscriptionId}`);

    // Send downgrade email
    const userInfo = await SubscriptionEmailService.getUserInfo(userId);
    if (userInfo && userInfo.email) {
      await SubscriptionEmailService.sendAccountDowngraded({
        userEmail: userInfo.email,
        userName: userInfo.name,
        downgradeReason: 'cancelled',
        downgradeDate: new Date().toISOString(),
        reactivateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
      });
    }
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
    if (!subscriptionId) return;

    // Find user by subscription ID (more reliable than metadata)
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      console.error('[webhook] Subscription not found in database:', subscriptionId);
      return;
    }

    const userId = existingSub.user_id;

    if (invoice.period_end) {
      const renewalDate = new Date(invoice.period_end * 1000);
      
      // Use upsert to avoid UPDATE RLS issues
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert(
          {
            user_id: userId,
            subscription_renewal_date: renewalDate.toISOString(),
            subscription_ends_at: renewalDate.toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error('[webhook] Error updating payment succeeded status:', error);
      } else {
        console.log('[webhook] Payment succeeded, subscription renewed:', subscriptionId);
        
        // Get subscription details for email
        const { data: subscriptionData } = await supabase
          .from('user_subscriptions')
          .select('billing_cycle, subscription_renewal_date')
          .eq('user_id', userId)
          .single();

        // Send payment receipt email
        const userInfo = await SubscriptionEmailService.getUserInfo(userId);
        if (userInfo && userInfo.email && invoice) {
          const amount = (invoice.amount_paid / 100).toFixed(2);
          const currency = invoice.currency?.toUpperCase() || 'GBP';
          const billingCycle = subscriptionData?.billing_cycle || 'monthly';
          
          await SubscriptionEmailService.sendPaymentReceipt({
            userEmail: userInfo.email,
            userName: userInfo.name,
            amount: `${currency === 'GBP' ? '£' : '$'}${amount}`,
            currency,
            billingCycle: billingCycle as 'monthly' | 'yearly',
            paymentDate: new Date().toISOString(),
            invoiceNumber: invoice.number || invoice.id,
            invoiceUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || undefined,
            nextBillingDate: subscriptionData?.subscription_renewal_date || new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    console.error('[webhook] Error in handleInvoicePaymentSucceeded:', error);
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    if (subscriptionId) {
      // Find user by subscription ID
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('user_id, billing_cycle')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (!existingSub) {
        console.error('[webhook] Subscription not found for payment failed:', subscriptionId);
        return;
      }

      const userId = existingSub.user_id;
      const gracePeriodEndDate = new Date();
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 7); // 7-day grace period

      // Mark as past_due and set grace period end date
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`⚠️ Payment failed, subscription marked as past_due: ${subscriptionId}`);
      
      // Send payment failed email
      const userInfo = await SubscriptionEmailService.getUserInfo(userId);
      if (userInfo && userInfo.email && invoice) {
        const amount = (invoice.amount_due / 100).toFixed(2);
        const currency = invoice.currency?.toUpperCase() || 'GBP';
        const billingCycle = existingSub.billing_cycle || 'monthly';
        
        await SubscriptionEmailService.sendPaymentFailed({
          userEmail: userInfo.email,
          userName: userInfo.name,
          amount: `${currency === 'GBP' ? '£' : '$'}${amount}`,
          currency,
          billingCycle: billingCycle as 'monthly' | 'yearly',
          paymentDate: new Date().toISOString(),
          gracePeriodEndDate: gracePeriodEndDate.toISOString(),
          updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=billing&action=update-payment`
        });
      }
      
      // Note: Grace period handling will check past_due subscriptions and downgrade after 7 days
      // This should be done via a cron job or scheduled task
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