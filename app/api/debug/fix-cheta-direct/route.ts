import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Use service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Service role key not configured',
        details: 'Missing environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Cheta Asibe's user ID from the Supabase auth table
    const chetaUserId = '4312bf28-7ea3-4396-a883-e40e3367e479';

    // First, check current profile
    const { data: currentProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', chetaUserId)
      .single();

    if (checkError) {
      console.error('Error checking current profile:', checkError);
      return NextResponse.json({
        error: 'Profile not found',
        details: checkError.message
      }, { status: 404 });
    }

    console.log('Current profile role:', currentProfile.role);

    // Update Cheta Asibe's role to 'creator'
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: 'creator',
        updated_at: new Date().toISOString()
      })
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

    console.log('Updated profile:', data);

    return NextResponse.json({
      success: true,
      message: 'Cheta Asibe\'s role updated to creator successfully',
      previous_role: currentProfile.role,
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
