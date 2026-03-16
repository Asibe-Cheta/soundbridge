import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/src/lib/supabase';
import { grantGracePeriod } from '@/src/lib/grace-period-service';
import { stripe } from '@/src/lib/stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Stripe-Signature',
};

function getStripe(): Stripe | null {
  return stripe || null;
}

/** Webhook secret for this subscription endpoint (can be same or different from main webhook) */
function getSubscriptionWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTION || process.env.STRIPE_WEBHOOK_SECRET || '';
}

/**
 * POST /api/webhooks/subscription
 * Handles subscription events from RevenueCat/Stripe
 * Updates user subscription status in database
 *
 * SECURITY:
 * - Stripe webhooks are verified using signature validation
 * - RevenueCat webhooks are verified using Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createServiceClient();

    // Get raw body for Stripe signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const authHeader = request.headers.get('authorization');

    // Determine webhook source
    let payload: any;

    // Check if it's a Stripe webhook (has Stripe-Signature header)
    if (signature) {
      console.log('💳 Verifying Stripe webhook signature...');

      const webhookSecret = getSubscriptionWebhookSecret();
      if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_SUBSCRIPTION not set');
        return NextResponse.json({ received: true, error: 'Webhook secret not configured' }, { status: 200, headers: corsHeaders });
      }

      const stripeClient = getStripe();
      if (!stripeClient) {
        console.error('❌ Stripe not configured');
        return NextResponse.json({ received: true, error: 'Stripe not configured' }, { status: 200, headers: corsHeaders });
      }

      try {
        const event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
        payload = event;
        console.log('✅ Stripe signature verified');
      } catch (err: any) {
        console.error('❌ Stripe signature verification failed:', err.message);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400, headers: corsHeaders }
        );
      }

      const response = await handleStripeWebhook(supabase, payload);
      return response;
    }

    // Check if it's a RevenueCat webhook (has Authorization header)
    else if (authHeader) {
      console.log('🍎 Verifying RevenueCat webhook authorization...');

      payload = JSON.parse(body);

      // Verify RevenueCat authorization (optional but recommended)
      const expectedAuth = process.env.REVENUECAT_WEBHOOK_SECRET;
      if (expectedAuth) {
        const providedAuth = authHeader.replace('Bearer ', '');
        if (providedAuth !== expectedAuth) {
          console.error('❌ RevenueCat authorization failed');
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401, headers: corsHeaders }
          );
        }
        console.log('✅ RevenueCat authorization verified');
      }

      return handleRevenueCatWebhook(supabase, payload);
    }

    // Unknown webhook source
    else {
      payload = JSON.parse(body);
      console.log('📨 WEBHOOK: Received subscription event:', payload.type || payload.event);

      // Fallback: Try to detect based on payload structure
      const isRevenueCat = payload.type && payload.type.startsWith('INITIAL_PURCHASE') || payload.event && payload.event.type;
      const isStripe = payload.object === 'event';

      if (isRevenueCat) {
        console.warn('⚠️ RevenueCat webhook received without Authorization header - please configure it for security');
        return handleRevenueCatWebhook(supabase, payload);
      } else if (isStripe) {
        console.error('❌ Stripe webhook received without signature - rejecting for security');
        return NextResponse.json(
          { error: 'Missing Stripe signature' },
          { status: 401, headers: corsHeaders }
        );
      } else {
        console.error('❌ WEBHOOK: Unknown webhook source');
        return NextResponse.json(
          { error: 'Unknown webhook source' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

  } catch (error: any) {
    console.error('❌ WEBHOOK: Error processing webhook:', error);
    // Always return 200 so Stripe does not disable the webhook (STRIPE_WEBHOOK_DISABLED_FIX.md)
    return NextResponse.json(
      { received: true, error: error?.message },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Handle RevenueCat webhook events
 */
async function handleRevenueCatWebhook(supabase: any, payload: any) {
  const eventType = payload.type;
  const event = payload.event;

  console.log('🍎 REVENUECAT WEBHOOK:', eventType);

  // Extract user identifier (RevenueCat app_user_id should match our user ID)
  const userId = event.app_user_id;
  if (!userId) {
    console.error('❌ REVENUECAT: No app_user_id in webhook');
    return NextResponse.json({ error: 'Missing app_user_id' }, { status: 400, headers: corsHeaders });
  }

  // Extract subscription info
  const productId = event.product_id; // e.g., "soundbridge_premium_monthly"
  const expiresDate = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const purchaseDate = event.purchased_at_ms ? new Date(event.purchased_at_ms) : null;

  // Determine tier and period from product ID
  const { tier, period } = parseProductId(productId);

  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      // User subscribed or renewed
      await handleSubscriptionActivated(supabase, {
        userId,
        tier,
        period,
        status: 'active',
        startDate: purchaseDate || new Date(),
        renewalDate: expiresDate,
        revenuecatCustomerId: userId,
      });
      break;

    case 'CANCELLATION':
      // User cancelled (but still has access until expiration)
      await handleSubscriptionCancelled(supabase, {
        userId,
        cancelDate: new Date(),
      });
      break;

    case 'EXPIRATION':
      // Subscription expired, revert to free
      await handleSubscriptionExpired(supabase, {
        userId,
      });
      break;

    case 'BILLING_ISSUE':
      // Payment failed
      await handlePaymentFailed(supabase, {
        userId,
      });
      break;

    default:
      console.log('ℹ️ REVENUECAT: Unhandled event type:', eventType);
  }

  return NextResponse.json({ received: true }, { headers: corsHeaders });
}

/**
 * Handle Stripe webhook events.
 * Always returns 200 so Stripe does not disable the webhook.
 */
async function handleStripeWebhook(supabase: any, payload: any) {
  const event = payload;
  const eventType = event.type;
  const obj = event.data.object;

  console.log('💳 STRIPE WEBHOOK:', eventType);

  try {
    // checkout.session.completed: object is Session
    if (eventType === 'checkout.session.completed') {
      const session = obj as { customer?: string; subscription?: string; metadata?: { userId?: string; user_id?: string } };
      const userId = session.metadata?.userId || session.metadata?.user_id;
      if (!userId) {
        console.warn('⚠️ STRIPE: No userId in checkout session metadata');
        return NextResponse.json({ received: true, skipped: true }, { status: 200, headers: corsHeaders });
      }
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      if (subscriptionId && getStripe()) {
        const sub = await getStripe()!.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items?.data?.[0]?.price?.id || (sub as any).plan?.id;
        const { tier, period } = parsePriceId(priceId);
        await handleSubscriptionActivated(supabase, {
          userId,
          tier: tier === 'free' ? 'premium' : tier,
          period,
          status: 'active',
          startDate: new Date(sub.current_period_start * 1000),
          renewalDate: new Date(sub.current_period_end * 1000),
          stripeCustomerId: customerId,
        });
      }
      return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
    }

    // invoice.payment_succeeded / invoice.payment_failed: object is Invoice
    if (eventType === 'invoice.payment_succeeded') {
      const invoice = obj as { customer?: string; subscription?: string };
      const subscriptionId = invoice.subscription as string;
      if (!subscriptionId || !getStripe()) {
        return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
      }
      const sub = await getStripe()!.subscriptions.retrieve(subscriptionId);
      return handleStripeWebhook(supabase, { ...event, type: 'customer.subscription.updated', data: { object: sub } });
    }

    if (eventType === 'invoice.payment_failed') {
      const invoice = obj as { customer?: string };
      const customerId = invoice.customer as string;
      const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single();
      if (profile?.id) {
        await handlePaymentFailed(supabase, { userId: profile.id });
      }
      return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
    }

    // Subscription events: object is Subscription
    const subscription = obj;
    const customerId = subscription.customer;
    const priceId = subscription.items?.data?.[0]?.price?.id || subscription.plan?.id;

    const metadataUserId =
      subscription?.metadata?.userId ||
      subscription?.metadata?.user_id ||
      subscription?.metadata?.userid;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    const userId = profile?.id || metadataUserId;

    if (!userId) {
      console.warn('⚠️ STRIPE: No user found for customer:', customerId);
      return NextResponse.json(
        { received: true, skipped: true, reason: 'User not found' },
        { status: 200, headers: corsHeaders }
      );
    }

    const { tier, period } = parsePriceId(priceId);

    switch (eventType) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const status = subscription.status === 'active' ? 'active' :
                       subscription.status === 'past_due' ? 'past_due' :
                       subscription.status === 'canceled' ? 'cancelled' : 'active';

        await handleSubscriptionActivated(supabase, {
          userId,
          tier: tier === 'free' ? 'premium' : tier,
          period,
          status,
          startDate: new Date((subscription.current_period_start ?? 0) * 1000),
          renewalDate: new Date((subscription.current_period_end ?? 0) * 1000),
          stripeCustomerId: customerId,
        });
        break;
      }

      case 'customer.subscription.deleted':
        await handleSubscriptionExpired(supabase, { userId });
        break;

      default:
        console.log('ℹ️ STRIPE: Unhandled event type:', eventType);
    }

    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error('❌ STRIPE WEBHOOK handler error:', err);
    return NextResponse.json({ received: true, error: err?.message }, { status: 200, headers: corsHeaders });
  }
}

/**
 * Parse Stripe Price ID or RevenueCat Product ID to extract tier and period
 *
 * For Stripe: Uses environment variables to map price IDs
 * For RevenueCat: Parses product identifier string
 *
 * Examples:
 * - "soundbridge_premium_monthly" -> { tier: "premium", period: "monthly" }
 * - "price_ABC123" (Stripe) -> Looks up in env vars
 */
function parsePriceId(priceId: string): { tier: 'free' | 'premium' | 'unlimited'; period: 'monthly' | 'annual' | null } {
  if (!priceId) {
    return { tier: 'free', period: null };
  }

  // Map Stripe Price IDs from environment variables
  const priceIdMap: Record<string, { tier: 'premium' | 'unlimited'; period: 'monthly' | 'annual' }> = {
    [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '']: { tier: 'premium', period: 'monthly' },
    [process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || '']: { tier: 'premium', period: 'annual' },
    [process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID || '']: { tier: 'unlimited', period: 'monthly' },
    [process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID || '']: { tier: 'unlimited', period: 'annual' },
  };

  // Check if it's a Stripe price ID (starts with "price_")
  if (priceId.startsWith('price_')) {
    const mapping = priceIdMap[priceId];
    if (mapping) {
      return mapping;
    }
    console.warn('⚠️ Unknown Stripe price ID:', priceId);
    return { tier: 'free', period: null };
  }

  // Otherwise, parse RevenueCat product identifier (e.g., "soundbridge_premium_monthly")
  const productIdLower = priceId.toLowerCase();

  // Determine tier
  let tier: 'free' | 'premium' | 'unlimited' = 'free';
  if (productIdLower.includes('premium')) {
    tier = 'premium';
  } else if (productIdLower.includes('unlimited')) {
    tier = 'unlimited';
  }

  // Determine period
  let period: 'monthly' | 'annual' | null = null;
  if (productIdLower.includes('monthly') || productIdLower.includes('month')) {
    period = 'monthly';
  } else if (productIdLower.includes('annual') || productIdLower.includes('year') || productIdLower.includes('yearly')) {
    period = 'annual';
  }

  return { tier, period };
}

/**
 * Handle subscription activation (new or renewal)
 */
async function handleSubscriptionActivated(supabase: any, data: {
  userId: string;
  tier: 'premium' | 'unlimited';
  period: 'monthly' | 'annual' | null;
  status: 'active' | 'past_due';
  startDate: Date;
  renewalDate: Date | null;
  stripeCustomerId?: string;
  revenuecatCustomerId?: string;
}) {
  console.log('✅ ACTIVATING SUBSCRIPTION:', data.userId, data.tier, data.period);

  const updateData: any = {
    subscription_tier: data.tier,
    subscription_period: data.period,
    subscription_status: data.status,
    subscription_start_date: data.startDate.toISOString(),
    subscription_renewal_date: data.renewalDate?.toISOString(),
    upload_period_start: new Date().toISOString(),
    uploads_this_period: 0, // Reset upload counter on activation
  };

  if (data.stripeCustomerId) {
    updateData.stripe_customer_id = data.stripeCustomerId;
  }

  if (data.revenuecatCustomerId) {
    updateData.revenuecat_customer_id = data.revenuecatCustomerId;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', data.userId);

  if (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  }

  console.log('✅ Subscription activated for user:', data.userId);

  // TODO: Send welcome email
  await sendEmail(data.userId, 'welcome', {
    tier: data.tier,
    period: data.period,
  });
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(supabase: any, data: {
  userId: string;
  cancelDate: Date;
}) {
  console.log('🚫 CANCELLING SUBSCRIPTION:', data.userId);

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_cancel_date: data.cancelDate.toISOString(),
    })
    .eq('id', data.userId);

  if (error) {
    console.error('❌ Error cancelling subscription:', error);
    throw error;
  }

  console.log('✅ Subscription cancelled for user:', data.userId);

  // TODO: Send cancellation confirmation email
  await sendEmail(data.userId, 'cancellation', {});
}

/**
 * Handle subscription expiration
 */
async function handleSubscriptionExpired(supabase: any, data: {
  userId: string;
}) {
  console.log('⏰ EXPIRING SUBSCRIPTION:', data.userId);

  // Get current tier before downgrading
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', data.userId)
    .single();

  const currentTier = profile?.subscription_tier || 'free';

  // Grant grace period if downgrading from paid tier to free
  if (currentTier !== 'free') {
    const normalizedTier = currentTier === 'pro' ? 'premium' : currentTier === 'enterprise' ? 'unlimited' : currentTier;
    if (normalizedTier === 'premium' || normalizedTier === 'unlimited') {
      const graceResult = await grantGracePeriod(data.userId, normalizedTier as 'premium' | 'unlimited', 'free');
      if (graceResult.success) {
        console.log(`✅ Grace period granted to user ${data.userId} until ${graceResult.gracePeriodEnds}`);
      } else {
        console.log(`⚠️ Grace period not granted to user ${data.userId}: ${graceResult.error}`);
      }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'expired',
      subscription_period: null,
      custom_username: null, // Remove custom URL
    })
    .eq('id', data.userId);

  if (error) {
    console.error('❌ Error expiring subscription:', error);
    throw error;
  }

  console.log('✅ Subscription expired, reverted to free for user:', data.userId);

  // TODO: Send expiration notification email
  await sendEmail(data.userId, 'expiration', {});
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(supabase: any, data: {
  userId: string;
}) {
  console.log('💔 PAYMENT FAILED:', data.userId);

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', data.userId);

  if (error) {
    console.error('❌ Error updating payment failure:', error);
    throw error;
  }

  console.log('✅ Marked subscription as past_due for user:', data.userId);

  // TODO: Send payment failure email
  await sendEmail(data.userId, 'payment_failed', {});
}

/**
 * Send email notification
 * TODO: Implement actual email sending (using Resend, SendGrid, etc.)
 */
async function sendEmail(userId: string, type: string, data: any) {
  console.log('📧 TODO: Send email:', type, 'to user:', userId, data);
  // Placeholder for email sending implementation
}
