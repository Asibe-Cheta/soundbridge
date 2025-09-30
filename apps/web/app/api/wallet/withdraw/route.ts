import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    let supabase;
    let user;
    let authError;

    // Check for Authorization header (mobile app) - try ALL mobile app headers
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      // Mobile app authentication
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
      // Web app authentication
      const cookieStore = cookies();
      supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
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

    const body = await request.json();
    const { amount, currency = 'USD', withdrawal_method_id, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!withdrawal_method_id) {
      return NextResponse.json(
        { error: 'Withdrawal method is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user has sufficient balance
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      return NextResponse.json(
        { error: 'Failed to fetch wallet information' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify withdrawal method exists and belongs to user
    const { data: withdrawalMethod, error: methodError } = await supabase
      .from('wallet_withdrawal_methods')
      .select('*')
      .eq('id', withdrawal_method_id)
      .eq('user_id', user.id)
      .single();

    if (methodError || !withdrawalMethod) {
      return NextResponse.json(
        { error: 'Invalid withdrawal method' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create withdrawal transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'withdrawal',
        amount: -amount, // Negative amount for withdrawal
        currency,
        description: description || 'Wallet withdrawal',
        status: 'pending',
        metadata: {
          withdrawal_method_id,
          method_type: withdrawalMethod.method_type
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating withdrawal transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('user_wallets')
      .update({ 
        balance: wallet.balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('currency', currency);

    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      // Note: In production, you might want to rollback the transaction here
    }

    return NextResponse.json(
      { 
        success: true,
        transactionId: transaction.id,
        message: 'Withdrawal request submitted successfully'
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { message: 'CORS preflight' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
      }
    }
  );
}
