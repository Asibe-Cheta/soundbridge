import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Get tip analytics using the database function
    const { data: analytics, error: analyticsError } = await supabase
      .rpc('get_creator_tip_analytics', {
        creator_uuid: user.id,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null
      });

    if (analyticsError) {
      console.error('Error fetching tip analytics:', analyticsError);
      return NextResponse.json(
        { error: 'Failed to fetch tip analytics' },
        { status: 500 }
      );
    }

    // Get recent tips for detailed view
    const { data: recentTips, error: tipsError } = await supabase
      .from('tip_analytics')
      .select(`
        id,
        tipper_id,
        tipper_tier,
        tip_amount,
        platform_fee,
        creator_earnings,
        tip_message,
        is_anonymous,
        created_at,
        status
      `)
      .eq('creator_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tipsError) {
      console.error('Error fetching recent tips:', tipsError);
      return NextResponse.json(
        { error: 'Failed to fetch recent tips' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analytics: analytics[0] || {
        total_tips: 0,
        total_amount: 0,
        total_earnings: 0,
        total_fees: 0,
        average_tip: 0,
        tips_by_tier: { free: 0, pro: 0, enterprise: 0 }
      },
      recentTips: recentTips || []
    });

  } catch (error) {
    console.error('Error in tip analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
