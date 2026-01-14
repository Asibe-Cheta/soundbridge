import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe, getPriceId } from '@/src/lib/stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second Vercel function timeout

// Map plan names to Stripe Price IDs
// Uses actual environment variable names deployed in Vercel
const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    yearly: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  },
  unlimited: {
    monthly: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
    yearly: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_UNLIMITED_YEARLY,
  },
  // Legacy Pro tier (maps to Premium for backward compatibility)
  pro: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_MONTHLY || process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body - support both formats
    const body = await request.json();
    const { priceId, plan, billing, billingCycle } = body;

    // Determine billing cycle (support both 'billing' and 'billingCycle' for compatibility)
    const finalBillingCycle = (billing || billingCycle || 'monthly').toLowerCase() as 'monthly' | 'yearly';

    // Validate inputs
    if (!plan && !priceId) {
      return NextResponse.json(
        { error: 'Plan or price ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['monthly', 'yearly'].includes(finalBillingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Authenticate user
    console.log('[create-checkout-session] Authenticating user...');
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('[create-checkout-session] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    console.log('[create-checkout-session] User authenticated:', user.id);

    // Get price ID from body or derive from plan + billing cycle
    let finalPriceId = priceId;
    if (!finalPriceId && plan) {
      const planKey = plan.toLowerCase();
      finalPriceId = PRICE_IDS[planKey]?.[finalBillingCycle];
      
      // Fallback to getPriceId helper for backward compatibility
      if (!finalPriceId) {
        finalPriceId = getPriceId(planKey as 'pro' | 'premium' | 'unlimited', finalBillingCycle);
      }
    }

    // Debug logging
    console.log('[create-checkout-session] Creating checkout session:', { 
      plan: plan?.toLowerCase(), 
      billing: finalBillingCycle, 
      userId: user.id 
    });
    console.log('[create-checkout-session] Available price IDs:', PRICE_IDS);

    // Validate price ID
    if (!finalPriceId) {
      console.error('[create-checkout-session] Price ID not found:', { 
        plan: plan?.toLowerCase(), 
        billing: finalBillingCycle, 
        availablePrices: PRICE_IDS 
      });
      return NextResponse.json(
        { error: 'Stripe pricing not configured. Please set up Stripe price IDs.' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!finalPriceId.startsWith('price_')) {
      console.error('[create-checkout-session] Invalid price ID format:', finalPriceId);
      return NextResponse.json(
        { error: 'Invalid Stripe price ID format. Must start with "price_"' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('[create-checkout-session] Using price ID:', finalPriceId);

    // Get or create Stripe customer
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('[create-checkout-session] Created new customer:', customerId);
    }

    // Create Checkout Session
    console.log('[create-checkout-session] Creating session for user:', user.id);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId, // Use customer ID (we always have one since we create it if missing)
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/pricing?canceled=true`,
      // Note: Do NOT set customer_email when customer is set - Stripe only allows one
      metadata: {
        userId: user.id,
        plan: plan?.toLowerCase() || 'unknown',
        billing: finalBillingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan?.toLowerCase() || 'unknown',
        },
      },
    });

    console.log('[create-checkout-session] Session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[create-checkout-session] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}