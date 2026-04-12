import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSupabaseRouteClient(request, true);
    if (auth.error || !auth.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const { supabase, user } = auth;

    // Get payout requests history
    const { data, error } = await supabase.rpc('get_creator_payout_requests', {
      p_creator_id: user.id
    });

    if (error) {
      console.error('Error getting payout history:', error);
      return NextResponse.json(
        { error: 'Failed to get payout history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payouts: data || []
    });
    
  } catch (error) {
    console.error('Error in payout history endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
