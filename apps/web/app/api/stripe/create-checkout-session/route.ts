import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe, getPriceId } from '../../../../src/lib/stripe';

export async function POST(request: NextRequest) {
  // Add CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { plan, billingCycle } = await request.json();

    // Validate input
    if (!plan || !billingCycle) {
      return NextResponse.json(
        { error: 'Plan and billing cycle are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "enterprise"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user from Supabase - support both cookie and Bearer token auth
    let user;
    let authError;

    // Check for Authorization header (mobile app)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Create a fresh Supabase client with the provided token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      // Get user with the token
      const { data, error } = await supabase.auth.getUser(token);
      user = data.user;
      authError = error;
    } else {
      // Use cookie-based auth (web app)
      const supabase = createServerComponentClient({ cookies });
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get price ID
    const priceId = getPriceId(plan as 'pro' | 'enterprise', billingCycle as 'monthly' | 'yearly');

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/dashboard?tab=subscription&success=true`,
      cancel_url: `${request.nextUrl.origin}/pricing?cancelled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        plan,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
          billingCycle,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: {
        enabled: true,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
