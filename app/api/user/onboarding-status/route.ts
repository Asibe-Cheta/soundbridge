import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
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

    // Check if user has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, selected_role, profile_completed, first_action_completed')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // If onboarding is already completed, return false
    if (profile?.onboarding_completed) {
      return NextResponse.json({
        success: true,
        needsOnboarding: false,
        onboardingCompleted: true
      });
    }

    // Check if user needs onboarding based on profile completeness
    const needsOnboarding = !profile?.onboarding_completed;
    
    return NextResponse.json({
      success: true,
      needsOnboarding,
      currentStep: profile?.onboarding_step || 'role_selection',
      selectedRole: profile?.selected_role || null,
      profileCompleted: profile?.profile_completed || false,
      firstActionCompleted: profile?.first_action_completed || false,
    });

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
