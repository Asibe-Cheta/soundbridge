import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe, getPriceId } from '../../../../src/lib/stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second Vercel function timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚨 PRODUCTION DEBUG: Stripe Checkout API called at', new Date().toISOString());
  
  // Add CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    console.log('🚨 STEP 1: Starting request processing...');
    
    // Check if Stripe is configured
    if (!stripe) {
      console.error('🚨 STRIPE ERROR: Not configured');
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' },
        { status: 500, headers: corsHeaders }
      );
    }
    console.log('🚨 STEP 2: Stripe client OK');

    // Parse request body with timeout
    console.log('🚨 STEP 3: Parsing request body...');
    const bodyPromise = request.json();
    const bodyTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Body parse timeout')), 5000)
    );
    
    const { plan, billingCycle } = await Promise.race([bodyPromise, bodyTimeout]);
    console.log('🚨 STEP 4: Body parsed:', { plan, billingCycle });

    // Validate input
    if (!plan || !billingCycle) {
      console.error('🚨 VALIDATION ERROR: Missing plan or billingCycle');
      return NextResponse.json(
        { error: 'Plan and billing cycle are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['pro', 'enterprise'].includes(plan)) {
      console.error('🚨 VALIDATION ERROR: Invalid plan:', plan);
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "enterprise"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      console.error('🚨 VALIDATION ERROR: Invalid billing cycle:', billingCycle);
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400, headers: corsHeaders }
      );
    }
    console.log('🚨 STEP 5: Validation passed');

    // Get user from Supabase - support both cookie and Bearer token auth
    console.log('🚨 STEP 6: Starting authentication...');
    let user;
    let authError;

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    console.log('🚨 AUTH DEBUG: Header found:', !!authHeader);
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      console.log('🚨 STEP 7: Using Bearer token auth...');
      // Handle both "Bearer token" format and raw token format
      const token = authHeader.startsWith('Bearer ') ? 
                   authHeader.substring(7) : 
                   authHeader;
      
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
      
      // Get user with the token - add timeout to prevent hanging
      console.log('🚨 STEP 8: Getting user with Bearer token...');
      try {
        const authPromise = supabase.auth.getUser(token);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout after 8 seconds')), 8000)
        );
        
        const result = await Promise.race([authPromise, timeoutPromise]) as { data: any; error: any };
        user = result.data.user;
        authError = result.error;
        console.log('🚨 STEP 9: User authenticated:', !!user);
      } catch (timeoutError: any) {
        console.error('🚨 AUTH TIMEOUT:', timeoutError);
        return NextResponse.json(
          { error: 'Authentication timeout', details: timeoutError.message },
          { status: 408, headers: corsHeaders }
        );
      }
    } else {
      console.log('🚨 STEP 7: Using cookie auth...');
      // Use cookie-based auth (web app)
      const supabase = createServerComponentClient({ cookies });
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
      console.log('🚨 STEP 8: Cookie auth result:', !!user);
    }
    
    if (authError || !user) {
      console.error('🚨 AUTH ERROR:', authError?.message);
      return NextResponse.json(
        { error: 'User not authenticated', details: authError?.message },
        { status: 401, headers: corsHeaders }
      );
    }
    console.log('🚨 STEP 10: Authentication successful');

    // Get price ID
    console.log('🚨 STEP 11: Getting price ID...');
    const priceId = getPriceId(plan as 'pro' | 'enterprise', billingCycle as 'monthly' | 'yearly');
    
    console.log('🚨 PRICE DEBUG:', {
      plan,
      billingCycle,
      priceId,
      isPlaceholder: priceId.includes('placeholder')
    });
    
    // Check if we're using placeholder price IDs
    if (priceId.includes('placeholder')) {
      console.error('🚨 PRICE ERROR: Using placeholder price ID!');
      return NextResponse.json(
        { 
          error: 'Stripe pricing not configured. Please set up Stripe price IDs in environment variables.',
          details: `Price ID: ${priceId}`,
          priceId: priceId
        },
        { status: 500, headers: corsHeaders }
      );
    }
    console.log('🚨 STEP 12: Price ID validated');

    // Create Stripe Checkout session with aggressive timeout
    console.log('🚨 STEP 13: Creating Stripe checkout session...');
    
    const sessionConfig = {
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
    };
    
    console.log('🚨 STEP 14: Session config created');
    
    let session;
    try {
      // Add aggressive timeout to Stripe API call - CRITICAL FOR PRODUCTION
      console.log('🚨 STEP 15: Calling Stripe API...');
      const stripePromise = stripe.checkout.sessions.create(sessionConfig);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Stripe API timeout after 20 seconds')), 20000)
      );
      
      session = await Promise.race([stripePromise, timeoutPromise]) as any;
      console.log('🚨 STEP 16: Stripe session created successfully!');
    } catch (stripeError: any) {
      console.error('🚨 STRIPE API ERROR:', stripeError);
      const elapsed = Date.now() - startTime;
      return NextResponse.json(
        { 
          error: 'Stripe checkout session creation failed',
          details: stripeError.message,
          elapsed_ms: elapsed,
          timestamp: new Date().toISOString()
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log('🚨 SUCCESS: Checkout session created in', elapsed, 'ms');
    console.log('🚨 Session ID:', session.id);
    console.log('🚨 Session URL:', session.url);
    
    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('🚨 CRITICAL ERROR:', error);
    console.error('🚨 Error occurred after', elapsed, 'ms');
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message,
        elapsed_ms: elapsed,
        timestamp: new Date().toISOString()
      },
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