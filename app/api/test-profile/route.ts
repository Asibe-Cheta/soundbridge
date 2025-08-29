import { NextResponse } from 'next/server';
import { createApiClient } from '../../../src/lib/supabase';

export async function GET() {
  try {
    console.log('🧪 Testing profile functionality...');
    const supabase = createApiClient();

    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Check if user has a profile
    console.log('🔍 Checking if user has a profile...');
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('❌ Profile fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: `Failed to fetch profile: ${fetchError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Profile found:', profile);

    // Test a simple profile update
    console.log('🔄 Testing profile update...');
    const testUpdate = { updated_at: new Date().toISOString() };
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(testUpdate)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Profile update test successful:', updatedProfile);

    return NextResponse.json({
      success: true,
      message: 'Profile test successful',
      profile: profile,
      updatedProfile: updatedProfile
    });

  } catch (error) {
    console.error('❌ Profile test error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
