import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe, getPriceId } from '../../../../src/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚨🚨🚨 STRIPE CHECKOUT API: REQUEST RECEIVED!!! 🚨🚨🚨');
  console.log('🚨 TIMESTAMP:', new Date().toISOString());
  console.log('🚨 URL:', request.url);
  console.log('🚨 METHOD:', request.method);
  console.log('🚨 HEADERS:', Object.fromEntries(request.headers.entries()));
  
  // Add CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    console.log('🚨 STRIPE CHECKOUT API: Starting processing...');
    
    // IMMEDIATE TEST - Return early with debug info
    console.log('🚨 EARLY RETURN TEST - API IS WORKING!');
    return NextResponse.json({
      success: true,
      message: 'STRIPE CHECKOUT API REACHED SUCCESSFULLY!',
      timestamp: new Date().toISOString(),
      debug: 'This proves the API route is working',
      received_headers: Object.fromEntries(request.headers.entries()),
      url: request.url,
      method: request.method
    }, { headers: corsHeaders });
    
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

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    console.log('🚨 MOBILE APP HEADER DEBUG (Checkout):');
    console.log('- authorization:', request.headers.get('authorization'));
    console.log('- Authorization:', request.headers.get('Authorization'));  
    console.log('- x-authorization:', request.headers.get('x-authorization'));
    console.log('- x-auth-token:', request.headers.get('x-auth-token'));
    console.log('- x-supabase-token:', request.headers.get('x-supabase-token'));
    console.log('- Final authHeader:', authHeader);
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
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
      console.log('🚨 CHECKOUT AUTH: Getting user with Bearer token...');
      try {
        const authPromise = supabase.auth.getUser(token);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout after 10 seconds')), 10000)
        );
        
        const { data, error } = await Promise.race([authPromise, timeoutPromise]);
        user = data.user;
        authError = error;
        console.log('🚨 CHECKOUT AUTH: User authenticated successfully:', !!user);
      } catch (timeoutError) {
        console.error('🚨 CHECKOUT AUTH TIMEOUT:', timeoutError);
        authError = timeoutError;
        user = null;
      }
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
    
    console.log('🚨 STRIPE CHECKOUT DEBUG:');
    console.log('- Plan:', plan);
    console.log('- Billing Cycle:', billingCycle);
    console.log('- Price ID:', priceId);
    console.log('- User ID:', user.id);
    console.log('- User Email:', user.email);
    console.log('- Is placeholder:', priceId.includes('placeholder'));
    
    // Check if we're using placeholder price IDs
    if (priceId.includes('placeholder')) {
      console.error('🚨 STRIPE CHECKOUT ERROR: Using placeholder price ID!');
      return NextResponse.json(
        { 
          error: 'Stripe pricing not configured. Please set up Stripe price IDs in environment variables.',
          details: `Price ID: ${priceId}`,
          priceId: priceId
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create Stripe Checkout session with timeout
    console.log('🚨 Creating Stripe checkout session...');
    
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
    
    console.log('🚨 STRIPE CONFIG:', JSON.stringify(sessionConfig, null, 2));
    
    let session;
    try {
      // Add timeout to Stripe API call to prevent hanging
      const stripePromise = stripe.checkout.sessions.create(sessionConfig);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Stripe API timeout after 30 seconds')), 30000)
      );
      
      session = await Promise.race([stripePromise, timeoutPromise]);
    } catch (stripeError) {
      console.error('🚨 STRIPE API ERROR:', stripeError);
      return NextResponse.json(
        { 
          error: 'Stripe checkout session creation failed',
          details: stripeError.message,
          timestamp: new Date().toISOString()
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('🚨 STRIPE CHECKOUT SUCCESS:');
    console.log('- Session ID:', session.id);
    console.log('- Session URL:', session.url);
    console.log('- Session created successfully!');
    
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}