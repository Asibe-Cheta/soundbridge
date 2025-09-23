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
