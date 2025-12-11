import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function POST(request: NextRequest) {
  // Add CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Use the correct auth method (same as tipping system and other working endpoints)
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
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

    // Get country from request body or default to US
    const { country = 'US' } = await request.json().catch(() => ({}));
    
    // Validate country code (Stripe supports specific countries)
    const supportedCountries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT', 'CH', 'IE', 'PT', 'LU', 'SI', 'SK', 'CZ', 'PL', 'HU', 'GR', 'CY', 'MT', 'EE', 'LV', 'LT', 'JP', 'SG', 'HK', 'MY', 'TH', 'NZ'];
    
    if (!supportedCountries.includes(country)) {
      return NextResponse.json(
        { error: `Country ${country} not supported by Stripe Connect` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country, // Dynamic country based on user selection
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
    // Use the authenticated supabase client from getSupabaseRouteClient
    // It already handles both web (cookie) and mobile (Bearer token) auth correctly
    
    // Get currency based on country
    const getCurrencyForCountry = (countryCode: string): string => {
      const currencyMap: Record<string, string> = {
        'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
        'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
        'JP': 'JPY', 'SG': 'SGD', 'HK': 'HKD', 'MY': 'MYR', 'TH': 'THB',
        'NZ': 'NZD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK'
      };
      return currencyMap[countryCode] || 'USD';
    };

    const currency = getCurrencyForCountry(country);

    // Check if bank account already exists
    const { data: existingAccount } = await supabase
      .from('creator_bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let updateError;

    if (existingAccount) {
      // Update existing record with Stripe account ID
      const { error } = await supabase
        .from('creator_bank_accounts')
        .update({
          stripe_account_id: account.id,
          verification_status: 'pending',
          is_verified: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      updateError = error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('creator_bank_accounts')
        .insert({
          user_id: user.id,
          stripe_account_id: account.id,
          verification_status: 'pending',
          is_verified: false,
          account_holder_name: user.user_metadata?.display_name || user.email,
          bank_name: 'Stripe Connect',
          account_number_encrypted: '', // Not needed for Stripe Connect
          routing_number_encrypted: '', // Not needed for Stripe Connect
          account_type: 'checking',
          currency: currency // Dynamic currency based on country
        });

      updateError = error;
    }

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
