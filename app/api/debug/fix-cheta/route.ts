import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClientWithCookies();

    // Cheta Asibe's user ID from the Supabase auth table
    const chetaUserId = '4312bf28-7ea3-4396-a883-e40e3367e479';

    // First, check if the profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', chetaUserId)
      .single();

    if (checkError) {
      console.error('Error checking existing profile:', checkError);
      return NextResponse.json({
        error: 'Profile not found',
        details: checkError.message
      }, { status: 404 });
    }

    console.log('Current profile:', existingProfile);

    // Update Cheta Asibe's role to 'creator'
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'creator' })
      .eq('id', chetaUserId)
      .select();

    if (error) {
      console.error('Error updating Cheta Asibe\'s role:', error);
      return NextResponse.json({
        error: 'Failed to update role',
        details: error.message
      }, { status: 500 });
    }

    console.log('Updated profile:', data);

    return NextResponse.json({
      success: true,
      message: 'Cheta Asibe\'s role updated to creator successfully',
      updated_profile: data?.[0] || data
    });

  } catch (error) {
    console.error('Unexpected error fixing Cheta Asibe:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
