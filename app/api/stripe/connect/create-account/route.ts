import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=revenue&refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=revenue&success=true`,
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
      return NextResponse.json(
        { error: 'Failed to store account information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url
    });
    
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
