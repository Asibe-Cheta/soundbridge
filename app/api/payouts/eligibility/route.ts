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

    // Get payout eligibility
    const { data, error } = await supabase.rpc('get_payout_eligibility', {
      p_creator_id: user.id
    });

    if (error) {
      console.error('Error getting payout eligibility:', error);
      return NextResponse.json(
        { error: 'Failed to get payout eligibility' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eligibility: data
    });
    
  } catch (error) {
    console.error('Error in payout eligibility endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
