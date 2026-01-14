import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    let user;
    let authError;

    // Handle authentication (mobile and web)
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {}
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options, maxAge: 0 });
              } catch (error) {}
            },
          },
        }
      );
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const { amount, currency = 'GBP', method = 'stripe' } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (method !== 'stripe') {
      return NextResponse.json(
        { error: 'Only Stripe payouts are currently supported' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's subscription tier for minimum balance check
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const userTier = profile?.subscription_tier || 'free';
    
    // Minimum balance requirements
    const minimumBalance = userTier === 'unlimited' ? 10.00 : 20.00;

    // Get user's wallet balance
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance, currency')
      .eq('user_id', user.id)
      .eq('currency', currency.toUpperCase())
      .single();

    const currentBalance = Number(wallet?.balance || 0);

    // Check sufficient balance
    if (currentBalance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check minimum balance requirement
    if (amount < minimumBalance) {
      return NextResponse.json(
        { error: `Minimum payout amount is ${currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'}${minimumBalance}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Stripe Connect account
    const { data: bankAccount, error: bankError } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id, is_verified')
      .eq('user_id', user.id)
      .single();

    if (bankError || !bankAccount || !bankAccount.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe Connect account not found. Please complete onboarding first.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!bankAccount.is_verified) {
      return NextResponse.json(
        { error: 'Your payout account is not yet verified. Please complete the verification process.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      destination: bankAccount.stripe_account_id,
      description: `Payout to creator`,
      metadata: {
        creator_id: user.id,
        payout_type: 'creator_earnings',
      },
    });

    // Deduct from wallet balance
    const { error: walletUpdateError } = await supabase
      .rpc('add_wallet_transaction', {
        user_uuid: user.id,
        transaction_type: 'payout',
        amount: -amount, // Negative amount for payout
        description: `Payout via Stripe`,
        reference_id: transfer.id,
        metadata: {
          method: 'stripe',
          currency: currency,
        }
      });

    if (walletUpdateError) {
      console.error('Error updating wallet:', walletUpdateError);
      // Don't fail - transfer is already created
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: currency.toUpperCase(),
        method: 'stripe',
        status: 'pending',
        stripe_transfer_id: transfer.id,
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Error creating payout record:', payoutError);
      // Don't fail - transfer is already created
    }

    // Calculate estimated arrival (typically 2-7 business days for Express accounts)
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + 5); // 5 business days estimate

    return NextResponse.json(
      {
        payout_id: payout?.id || 'pending',
        status: 'pending',
        amount: amount,
        currency: currency.toUpperCase(),
        estimated_arrival: estimatedArrival.toISOString().split('T')[0],
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error creating payout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
</think>
Checking if the payouts table exists and creating it if needed:
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
grep