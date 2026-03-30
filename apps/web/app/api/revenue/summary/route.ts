import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Get wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('balance, currency')
      .eq('user_id', user.id)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
      return NextResponse.json(
        { error: 'Failed to fetch wallet balance' },
        { status: 500, headers: corsHeaders }
      );
    }

    const earningTypes = ['tip_received', 'gig_payment', 'content_sale', 'deposit'] as const;

    const { data: completedEarnings, error: completedErr } = await supabase
      .from('wallet_transactions')
      .select('amount, currency')
      .eq('user_id', user.id)
      .in('transaction_type', [...earningTypes])
      .eq('status', 'completed');

    if (completedErr) {
      console.error('Error fetching completed earnings:', completedErr);
      return NextResponse.json(
        { error: 'Failed to fetch earnings' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { data: pendingEarningsRows, error: pendingErr } = await supabase
      .from('wallet_transactions')
      .select('amount, currency')
      .eq('user_id', user.id)
      .in('transaction_type', [...earningTypes])
      .eq('status', 'pending');

    if (pendingErr) {
      console.error('Error fetching pending earnings:', pendingErr);
      return NextResponse.json(
        { error: 'Failed to fetch pending earnings' },
        { status: 500, headers: corsHeaders }
      );
    }

    const walletCurrency = wallet?.currency || 'USD',
      sumAmount = (rows: { amount: number | null; currency?: string | null }[] | null) =>
        (rows ?? []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalEarnings = sumAmount(completedEarnings ?? []);
    const pendingEarnings = sumAmount(pendingEarningsRows ?? []);

    const { data: lastPayoutRow, error: payoutErr } = await supabase
      .from('wallet_transactions')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .eq('transaction_type', 'payout')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payoutErr) {
      console.error('Error fetching last payout:', payoutErr);
    }

    const { data: recentTx, error: recentErr } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentErr) {
      console.error('Error fetching recent transactions:', recentErr);
    }

    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);

    return NextResponse.json(
      {
        success: true,
        user_id: user.id,
        total_earnings: totalEarnings,
        pending_earnings: pendingEarnings,
        last_payout: lastPayoutRow?.amount ?? null,
        last_payout_date: lastPayoutRow?.created_at ?? null,
        next_payout_date: nextPayoutDate.toISOString(),
        currency: walletCurrency,
        revenue: {
          totalEarnings,
          pendingEarnings,
          availableBalance: wallet?.balance || 0,
          currency: walletCurrency,
          lastPayout: lastPayoutRow
            ? {
                amount: lastPayoutRow.amount,
                date: lastPayoutRow.created_at,
              }
            : null,
          nextPayout: {
            date: nextPayoutDate.toISOString(),
          },
          recentTransactions: recentTx ?? [],
        },
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching revenue summary:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
