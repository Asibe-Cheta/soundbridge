import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
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
      // Return default values if no revenue data exists
      return NextResponse.json({
        total_earned: 0,
        total_paid_out: 0,
        pending_balance: 0,
        available_balance: 0,
        this_month_earnings: 0,
        last_month_earnings: 0,
        total_tips: 0,
        total_track_sales: 0,
        total_subscriptions: 0
      });
    }

    return NextResponse.json(data[0]);
    
  } catch (error) {
    console.error('Error in revenue summary GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
