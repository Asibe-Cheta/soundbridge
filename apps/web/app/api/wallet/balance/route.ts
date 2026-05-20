import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { mergeCreatorRevenueSummaryWithWallet } from '@/src/lib/creator-revenue-summary-merge';
import { mapRevenueSummaryToClient } from '@/src/lib/revenue-api-mapper';

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

    async function loadEarningsSummary() {
      const { data: summaryRows, error: summaryError } = await supabase.rpc(
        'get_creator_revenue_summary',
        { user_uuid: user!.id },
      );
      if (summaryError || !summaryRows?.length) {
        return mapRevenueSummaryToClient({
          total_earned: 0,
          total_paid_out: 0,
          pending_balance: 0,
          available_balance: 0,
          wallet_balance: 0,
          pending_payout_requests: 0,
          this_month_earnings: 0,
          last_month_earnings: 0,
          total_tips: 0,
          total_track_sales: 0,
          total_subscriptions: 0,
        });
      }
      const merged = await mergeCreatorRevenueSummaryWithWallet(
        supabase,
        user!.id,
        summaryRows[0] as Record<string, unknown>,
      );
      return mapRevenueSummaryToClient(merged);
    }

    const { searchParams } = new URL(request.url);
    const currencyParam = searchParams.get('currency');

    // When no currency specified, return all wallets so the app can show balance (e.g. gig credits go to GBP, not USD)
    if (!currencyParam || currencyParam === '') {
      const { data: wallets, error: walletsError } = await supabase
        .from('user_wallets')
        .select('balance, currency')
        .eq('user_id', user.id);

      if (walletsError) {
        console.error('Error fetching wallet balances:', walletsError);
        return NextResponse.json(
          { error: 'Failed to fetch wallet balance' },
          { status: 500, headers: corsHeaders }
        );
      }

      const list = (wallets ?? []) as { balance: number; currency: string }[];
      const usdWallet = list.find((w) => w.currency === 'USD');
      const primary = usdWallet ?? list.find((w) => Number(w.balance) > 0) ?? list[0];
      const earnings = await loadEarningsSummary();
      return NextResponse.json(
        {
          balance: primary ? Number(primary.balance) : 0,
          currency: primary?.currency ?? 'USD',
          hasWallet: list.length > 0,
          wallets: list.map((w) => ({ currency: w.currency, balance: Number(w.balance) })),
          earnings,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const currency = currencyParam;

    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('balance, currency')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet balance:', walletError);
      return NextResponse.json(
        { error: 'Failed to fetch wallet balance' },
        { status: 500, headers: corsHeaders }
      );
    }

    const earnings = await loadEarningsSummary();
    return NextResponse.json(
      {
        balance: wallet?.balance || 0,
        currency: wallet?.currency || currency,
        hasWallet: !!wallet,
        earnings,
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
      }
    }
  );
}
