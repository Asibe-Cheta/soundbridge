import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Skip onboarding API called');
    
    // Get the user ID from the request body or headers
    const body = await request.json();
    const userId = body.userId;
    
    if (!userId) {
      console.error('❌ No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('✅ User ID provided:', userId);
    const supabase = createServiceClient();

    // Mark onboarding as skipped
    const { error: updateError } = await (supabase
      .from('profiles') as any)
      .update({
        onboarding_completed: true,
        onboarding_step: 'completed',
        onboarding_skipped: true,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error skipping onboarding:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to skip onboarding' },
        { status: 500 }
      );
    }

    console.log('✅ Onboarding skipped successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Onboarding skipped successfully'
    });

  } catch (error) {
    console.error('❌ Error skipping onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
