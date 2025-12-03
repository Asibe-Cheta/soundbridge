import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe, getPriceId } from '@/src/lib/stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second Vercel function timeout

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
    const { priceId, plan, billingCycle = 'monthly' } = body;

    // Get priceId from body or derive from plan + billingCycle
    let finalPriceId = priceId;
    if (!finalPriceId && plan) {
      finalPriceId = getPriceId(plan as 'pro', billingCycle as 'monthly' | 'yearly');
    }

    if (!finalPriceId) {
      return NextResponse.json(
        { error: 'Price ID or plan is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use unified auth helper (like tipping system)
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

    // Validate price ID
    if (!finalPriceId || finalPriceId.includes('placeholder')) {
      console.error('[create-checkout-session] Invalid price ID:', finalPriceId);
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
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          billing_cycle: billingCycle,
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