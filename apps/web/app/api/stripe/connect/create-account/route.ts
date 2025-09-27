import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

export async function POST(request: NextRequest) {
  // Add CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // URGENT PRODUCTION DEBUG: Log all request details
    console.log('🚨 PRODUCTION DEBUG - Request received');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    
    let supabase;
    let user;
    let authError;

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    console.log('🚨 MOBILE APP HEADER DEBUG:');
    console.log('- authorization:', request.headers.get('authorization'));
    console.log('- Authorization:', request.headers.get('Authorization'));  
    console.log('- x-authorization:', request.headers.get('x-authorization'));
    console.log('- x-auth-token:', request.headers.get('x-auth-token'));
    console.log('- x-supabase-token:', request.headers.get('x-supabase-token'));
    console.log('- Final authHeader:', authHeader);
    console.log('🚨 Auth header exists:', !!authHeader);
    console.log('🚨 Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      // Handle both "Bearer token" format and raw token format
      const token = authHeader.startsWith('Bearer ') ? 
                   authHeader.substring(7) : 
                   authHeader;
      
      console.log('🚨 MOBILE TOKEN DEBUG:');
      console.log('- Token length:', token.length);
      console.log('- Token preview:', token.substring(0, 50) + '...');
      console.log('- Token ends with:', '...' + token.substring(token.length - 20));
      
      // Check environment variables
      console.log('🚨 ENVIRONMENT CHECK:');
      console.log('- SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('- SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      console.log('- SUPABASE_URL value:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Create a fresh Supabase client with the provided token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      console.log('🚨 Supabase client created, calling getUser...');
      
      // Get user with the token - pass token directly to getUser
      const { data, error } = await supabase.auth.getUser(token);
      console.log('🚨 SUPABASE AUTH RESULT:');
      console.log('- User exists:', !!data.user);
      console.log('- User ID:', data.user?.id);
      console.log('- User email:', data.user?.email);
      console.log('- Error exists:', !!error);
      console.log('- Error message:', error?.message);
      console.log('- Error details:', JSON.stringify(error, null, 2));
      
      user = data.user;
      authError = error;
    } else {
      console.log('🚨 Using cookie-based auth (no Bearer token found)');
      // Use cookie-based auth (web app)
      supabase = createRouteHandlerClient({ cookies });
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    }
    
    console.log('🚨 FINAL AUTH CHECK:');
    console.log('- Auth error:', authError?.message || 'None');
    console.log('- User authenticated:', !!user);
    console.log('- Will return 401:', !!(authError || !user));
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // You might want to make this configurable
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: user.email,
        // You can add more individual details here
      },
    });

    // Create account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.soundbridge.live';
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/profile?tab=revenue&refresh=true`,
      return_url: `${baseUrl}/profile?tab=revenue&success=true`,
      type: 'account_onboarding',
    });

    // Store the Stripe account ID in the database
    const { error: updateError } = await supabase
      .from('creator_bank_accounts')
      .upsert({
        user_id: user.id,
        stripe_account_id: account.id,
        verification_status: 'pending',
        is_verified: false,
        account_holder_name: user.user_metadata?.display_name || user.email,
        bank_name: 'Stripe Connect',
        account_number_encrypted: '', // Not needed for Stripe Connect
        routing_number_encrypted: '', // Not needed for Stripe Connect
        account_type: 'checking',
        currency: 'USD'
      });

    if (updateError) {
      console.error('Error storing Stripe account:', updateError);
      console.error('Error details:', JSON.stringify(updateError, null, 2));
      
      // Check if it's a table not found error
      if (updateError.message?.includes('relation "creator_bank_accounts" does not exist')) {
        return NextResponse.json(
          { error: 'Database tables not set up. Please run the database setup script first.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to store account information: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url
    }, { headers: corsHeaders });
    
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);
    
    // Provide more specific error messages
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message?.includes('Connect')) {
        return NextResponse.json(
          { 
            error: 'Stripe Connect not enabled',
            details: 'Your Stripe account needs to be set up for Connect. Please visit https://stripe.com/docs/connect to enable Connect for your account.',
            action: 'enable_connect'
          },
          { status: 400 }
        );
      }
      
      // Handle platform profile error
      if (error.message?.includes('platform-profile') || error.message?.includes('managing losses')) {
        return NextResponse.json(
          { 
            error: 'Platform profile setup required',
            details: 'You need to complete your Stripe Connect platform profile setup. Please visit https://dashboard.stripe.com/settings/connect/platform-profile to complete the setup.',
            action: 'setup_platform_profile',
            url: 'https://dashboard.stripe.com/settings/connect/platform-profile'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Database tables not set up. Please run the database setup script first.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
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
