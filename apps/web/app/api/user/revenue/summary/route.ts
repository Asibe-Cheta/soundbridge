import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { mergeCreatorRevenueSummaryWithWallet } from '@/src/lib/creator-revenue-summary-merge';
import { mapRevenueSummaryToClient } from '@/src/lib/revenue-api-mapper';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

const emptySummary = {
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
};

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const { data, error } = await supabase.rpc('get_creator_revenue_summary', {
      user_uuid: user.id,
    });

    if (error) {
      console.error('Error fetching revenue summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revenue summary' },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!data || data.length === 0) {
      const revenue = mapRevenueSummaryToClient(emptySummary);
      return NextResponse.json(
        { ...emptySummary, revenue },
        { headers: corsHeaders },
      );
    }

    const merged = await mergeCreatorRevenueSummaryWithWallet(
      supabase,
      user.id,
      data[0] as Record<string, unknown>,
    );
    const revenue = mapRevenueSummaryToClient(merged);

    return NextResponse.json(
      { ...merged, revenue },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error in revenue summary GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
