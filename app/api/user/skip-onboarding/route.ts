import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Mark onboarding as skipped
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: 'completed',
        onboarding_skipped: true,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error skipping onboarding:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to skip onboarding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding skipped successfully'
    });

  } catch (error) {
    console.error('Error skipping onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
