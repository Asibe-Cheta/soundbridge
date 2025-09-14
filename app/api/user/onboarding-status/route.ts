import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Onboarding status API called');
    const supabase = await createApiClientWithCookies();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user has completed onboarding
    console.log('🔍 Checking profile for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, selected_role, profile_completed, first_action_completed')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    console.log('📊 Profile data:', profile);

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
    
    // Add additional logging for debugging
    console.log('📊 Onboarding status check result:', {
      userId: user.id,
      hasProfile: !!profile,
      onboardingCompleted: profile?.onboarding_completed,
      needsOnboarding,
      currentStep: profile?.onboarding_step
    });
    
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
