import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

/**
 * Payout eligibility for the current user. No creator role required — any authenticated user
 * can have a verified bank account and balance; eligibility = verified bank + sufficient balance.
 * @see WEB_TEAM_BANK_ACCOUNTS_FOR_ALL_USERS.md
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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
