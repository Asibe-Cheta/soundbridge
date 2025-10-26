import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Force complete onboarding API called');
    
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Mark onboarding as completed
    const updateData = {
      onboarding_completed: true,
      onboarding_step: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Force completing onboarding for user:', userId);

    // Update the profile
    const { data: updatedProfile, error: updateError } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error force completing onboarding:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to complete onboarding', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Onboarding force completed successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Onboarding force completed successfully',
      profile: updatedProfile
    });

  } catch (error: any) {
    console.error('❌ Error force completing onboarding:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
