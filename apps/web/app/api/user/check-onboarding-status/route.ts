import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Manual onboarding status check');
    
    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        role,
        onboarding_completed,
        onboarding_step,
        profile_completed,
        created_at,
        updated_at
      `)
      .eq('id', userId as any)
      .single() as { data: any; error: any };

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Authoritative cross-platform gate: onboarding is complete iff profiles.onboarding_completed is true.
    const onboardingCompleted = profile?.onboarding_completed === true;
    const needsOnboarding = !onboardingCompleted;
    
    console.log('📊 Manual onboarding status check result:', {
      userId,
      hasProfile: !!profile,
      role: profile?.role,
      onboardingCompleted,
      needsOnboarding,
      currentStep: profile?.onboarding_step
    });

    return NextResponse.json({
      success: true,
      needsOnboarding,
      profile: profile || null,
      onboarding: {
        completed: onboardingCompleted,
        step: profile?.onboarding_step || 'role_selection',
        profileCompleted: profile?.profile_completed || false
      }
    });

  } catch (error: any) {
    console.error('❌ Error checking onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
