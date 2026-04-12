import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { mergeCreatorRevenueSummaryWithWallet } from '@/src/lib/creator-revenue-summary-merge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function GET(request: NextRequest) {
  try {
    let supabase;
    let user;
    let authError;

    const authHeader =
      request.headers.get('authorization') ||
      request.headers.get('Authorization') ||
      request.headers.get('x-authorization') ||
      request.headers.get('x-auth-token') ||
      request.headers.get('x-supabase-token');

    if (
      authHeader &&
      (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))
    ) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      );
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
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

    const { data, error } = await supabase.rpc('get_creator_revenue_summary', {
      user_uuid: user.id,
    });

    if (error) {
      console.error('Error fetching revenue summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revenue summary' },
        { status: 500, headers: corsHeaders }
      );
    }

    const row = data?.[0];
    if (!row || data.length === 0) {
      return NextResponse.json(
        {
          revenue: {
            totalEarned: 0,
            totalPaidOut: 0,
            pendingBalance: 0,
            availableBalance: 0,
            thisMonthEarnings: 0,
            lastMonthEarnings: 0,
            totalTips: 0,
            totalTrackSales: 0,
            totalSubscriptions: 0,
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const merged = await mergeCreatorRevenueSummaryWithWallet(supabase, user.id, row as Record<string, unknown>);
    return NextResponse.json(
      {
        revenue: {
          totalEarned: merged.total_earned,
          totalPaidOut: merged.total_paid_out,
          pendingBalance: merged.pending_balance,
          availableBalance: merged.available_balance,
          thisMonthEarnings: merged.this_month_earnings,
          lastMonthEarnings: merged.last_month_earnings,
          totalTips: merged.total_tips,
          totalTrackSales: merged.total_track_sales,
          totalSubscriptions: merged.total_subscriptions,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Error in revenue balance GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
