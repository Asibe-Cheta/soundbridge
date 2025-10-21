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
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Determine if onboarding is needed
    const needsOnboarding = !profile?.onboarding_completed || !profile?.role;
    
    console.log('📊 Manual onboarding status check result:', {
      userId,
      hasProfile: !!profile,
      role: profile?.role,
      onboardingCompleted: profile?.onboarding_completed,
      needsOnboarding,
      currentStep: profile?.onboarding_step
    });

    return NextResponse.json({
      success: true,
      needsOnboarding,
      profile: profile || null,
      onboarding: {
        completed: profile?.onboarding_completed || false,
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
