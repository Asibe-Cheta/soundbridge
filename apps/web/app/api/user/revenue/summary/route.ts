import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
    
    // Get revenue summary
    const { data, error } = await supabase
      .rpc('get_creator_revenue_summary', { user_uuid: user.id });

    if (error) {
      console.error('Error fetching revenue summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch revenue summary' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      // Return default values if no revenue data exists (numbers for mobile .toFixed(2))
      return NextResponse.json({
        total_earned: 0,
        total_paid_out: 0,
        pending_balance: 0,
        available_balance: 0,
        this_month_earnings: 0,
        last_month_earnings: 0,
        total_tips: 0,
        total_track_sales: 0,
        total_subscriptions: 0,
      });
    }

    const row = data[0];
    const toNum = (v: unknown): number =>
      typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || 0;
    return NextResponse.json({
      total_earned: toNum(row.total_earned),
      total_paid_out: toNum(row.total_paid_out),
      pending_balance: toNum(row.pending_balance),
      available_balance: toNum(row.available_balance),
      this_month_earnings: toNum(row.this_month_earnings),
      last_month_earnings: toNum(row.last_month_earnings),
      total_tips: toNum(row.total_tips),
      total_track_sales: toNum(row.total_track_sales),
      total_subscriptions: toNum(row.total_subscriptions),
    });
    
  } catch (error) {
    console.error('Error in revenue summary GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
