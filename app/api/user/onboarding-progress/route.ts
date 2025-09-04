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

    const body = await request.json();
    const { currentStep, selectedRole, profileCompleted, firstActionCompleted } = body;

    // Update the user's onboarding progress
    const updateData: any = {};
    
    if (currentStep) updateData.onboarding_step = currentStep;
    if (selectedRole) updateData.selected_role = selectedRole;
    if (profileCompleted !== undefined) updateData.profile_completed = profileCompleted;
    if (firstActionCompleted !== undefined) updateData.first_action_completed = firstActionCompleted;

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating onboarding progress:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding progress updated successfully'
    });

  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
