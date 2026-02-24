import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/src/lib/supabase';
import { grantGracePeriod } from '@/src/lib/grace-period-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Stripe-Signature',
};

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
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

      // Verify Stripe webhook signature
      try {
        const event = getStripe().webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
        payload = event;
        console.log('✅ Stripe signature verified');
      } catch (err: any) {
        console.error('❌ Stripe signature verification failed:', err.message);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401, headers: corsHeaders }
        );
      }

      return handleStripeWebhook(supabase, payload);
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
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
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
 * Handle Stripe webhook events
 */
async function handleStripeWebhook(supabase: any, payload: any) {
  const event = payload;
  const eventType = event.type;

  console.log('💳 STRIPE WEBHOOK:', eventType);

  // Extract subscription data
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const priceId = subscription.items?.data[0]?.price?.id || subscription.plan?.id;

  // Get user ID from Stripe customer ID or metadata
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
    // Return 2xx so Stripe stops retrying old/unknown customers
    return NextResponse.json(
      { received: true, skipped: true, reason: 'User not found' },
      { status: 200, headers: corsHeaders }
    );
  }

  // Determine tier and period from price ID
  const { tier, period } = parsePriceId(priceId);

  switch (eventType) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // Subscription created or updated
      const status = subscription.status === 'active' ? 'active' :
                     subscription.status === 'past_due' ? 'past_due' :
                     subscription.status === 'canceled' ? 'cancelled' : 'active';

      await handleSubscriptionActivated(supabase, {
        userId,
        tier,
        period,
        status,
        startDate: new Date(subscription.current_period_start * 1000),
        renewalDate: new Date(subscription.current_period_end * 1000),
        stripeCustomerId: customerId,
      });
      break;

    case 'customer.subscription.deleted':
      // Subscription cancelled and expired
      await handleSubscriptionExpired(supabase, {
        userId,
      });
      break;

    case 'invoice.payment_failed':
      // Payment failed
      await handlePaymentFailed(supabase, {
        userId,
      });
      break;

    default:
      console.log('ℹ️ STRIPE: Unhandled event type:', eventType);
  }

  return NextResponse.json({ received: true }, { headers: corsHeaders });
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
