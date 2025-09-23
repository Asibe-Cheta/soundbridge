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

    const { amount, currency = 'USD' } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Get creator's Stripe Connect account
    const { data: bankAccount, error: bankError } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id, is_verified')
      .eq('user_id', user.id)
      .single();

    if (bankError || !bankAccount || !bankAccount.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe Connect account not found. Please set up your payout account first.' },
        { status: 400 }
      );
    }

    if (!bankAccount.is_verified) {
      return NextResponse.json(
        { error: 'Your payout account is not yet verified. Please complete the verification process.' },
        { status: 400 }
      );
    }

    // Create payout to the creator's Stripe Connect account
    const payout = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      destination: bankAccount.stripe_account_id,
      description: `Payout to ${user.email}`,
      metadata: {
        creator_id: user.id,
        payout_type: 'creator_earnings'
      }
    });

    // Record the payout in the database
    const { error: payoutError } = await supabase
      .from('creator_revenue')
      .update({
        total_payouts: supabase.raw(`total_payouts + ${amount}`),
        last_payout_date: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (payoutError) {
      console.error('Error updating creator revenue:', payoutError);
      // Don't fail the request, just log the error
    }

    // Record payout transaction
    const { error: transactionError } = await supabase
      .rpc('record_revenue_transaction', {
        user_uuid: user.id,
        transaction_type_param: 'payout',
        amount_param: -amount, // Negative amount for payouts
        customer_email_param: user.email,
        customer_name_param: 'SoundBridge Platform',
        stripe_payment_intent_id_param: payout.id
      });

    if (transactionError) {
      console.error('Error recording payout transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      amount: amount,
      currency: currency,
      message: 'Payout processed successfully'
    });
    
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
