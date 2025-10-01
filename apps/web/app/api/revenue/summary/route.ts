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

    // Get recent transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transaction history' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Calculate totals
    const totalEarnings = transactions
      ?.filter(t => t.type === 'earning' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const pendingEarnings = transactions
      ?.filter(t => t.type === 'earning' && t.status === 'pending')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const lastPayout = transactions
      ?.find(t => t.type === 'withdrawal' && t.status === 'completed');

    // Calculate next payout date (assuming monthly payouts on the 15th)
    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);

    return NextResponse.json(
      {
        success: true,
        revenue: {
          totalEarnings: totalEarnings,
          pendingEarnings: pendingEarnings,
          availableBalance: wallet?.balance || 0,
          currency: wallet?.currency || 'USD',
          lastPayout: lastPayout ? {
            amount: lastPayout.amount,
            date: lastPayout.created_at
          } : null,
          nextPayout: {
            date: nextPayoutDate.toISOString()
          }
        }
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
