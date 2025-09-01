import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClientWithCookies();

    // Cheta Asibe's user ID from the Supabase auth table
    const chetaUserId = '4312bf28-7ea3-4396-a883-e40e3367e479';

    // Update Cheta Asibe's role to 'creator'
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'creator' })
      .eq('id', chetaUserId)
      .select()
      .single();

    if (error) {
      console.error('Error updating Cheta Asibe\'s role:', error);
      return NextResponse.json({
        error: 'Failed to update role',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cheta Asibe\'s role updated to creator successfully',
      updated_profile: data
    });

  } catch (error) {
    console.error('Unexpected error fixing Cheta Asibe:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
