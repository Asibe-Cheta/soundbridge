import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClientWithCookies();

    // Cheta Asibe's user ID from the Supabase auth table
    const chetaUserId = '4312bf28-7ea3-4396-a883-e40e3367e479';

    // Get Cheta Asibe's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', chetaUserId)
      .single();

    if (error) {
      console.error('Error fetching Cheta Asibe\'s profile:', error);
      return NextResponse.json({
        error: 'Profile not found',
        details: error.message
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: profile,
      is_creator: profile.role === 'creator',
      debug_info: {
        timestamp: new Date().toISOString(),
        user_id: chetaUserId
      }
    });

  } catch (error) {
    console.error('Unexpected error checking Cheta Asibe:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
