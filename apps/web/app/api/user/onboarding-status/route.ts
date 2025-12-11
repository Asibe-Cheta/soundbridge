import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Onboarding Status API called');

    // Use unified authentication helper (supports both cookies and bearer tokens)
    const { supabase, user, error: authError, mode } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError, 'Auth mode:', mode);
      return NextResponse.json(
        { success: false, error: 'Authentication required - no valid session found' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        role,
        bio,
        location,
        country,
        genres,
        avatar_url,
        collaboration_enabled,
        min_notice_days,
        auto_decline_unavailable,
        social_links,
        onboarding_completed,
        onboarding_step,
        onboarding_user_type,
        profile_completed,
        subscription_tier,
        subscription_status,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .maybeSingle();

    // If no profile exists, return needs onboarding
    if (!profile) {
      console.log('⚠️ No profile found for user:', user.id);
      return NextResponse.json({
        success: true,
        needsOnboarding: true,
        profile: null,
        onboarding: {
          completed: false,
          step: 'welcome',  // NEW: Start with welcome screen
          profileCompleted: false
        }
      }, { headers: corsHeaders });
    }

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Determine if onboarding is needed
    // Check if user is on old flow steps (legacy flow)
    const isOldFlow = profile?.onboarding_step && ['role_selection', 'profile_setup', 'first_action'].includes(profile.onboarding_step);
    const isNewFlow = profile?.onboarding_step && ['welcome', 'userType', 'quickSetup', 'valueDemo', 'tierSelection', 'payment', 'welcomeConfirmation'].includes(profile.onboarding_step);

    // CRITICAL FIX: If user has an active subscription (premium/unlimited with active status),
    // they should NEVER see onboarding again, even if onboarding_completed is false
    const hasActiveSubscription = profile?.subscription_tier &&
                                   ['premium', 'unlimited'].includes(profile.subscription_tier) &&
                                   profile?.subscription_status === 'active';

    // User needs onboarding if:
    // 1. They DON'T have an active subscription (premium/unlimited users skip onboarding), AND
    // 2. Onboarding is not completed, OR
    // 3. They're on the old flow and missing a role (old flow requires role), OR
    // 4. They're on the new flow and missing both role AND onboarding_user_type (role gets set when QuickSetup completes)
    // Note:
    // - Old flow: requires `role` field (creator/listener)
    // - New flow: uses `onboarding_user_type` for categorization, but still sets `role` when profile is completed
    // - The `role` field is ALWAYS used for permissions (creator can upload, listener cannot)
    const needsOnboarding = !hasActiveSubscription &&
                            (!profile?.onboarding_completed ||
                            (isOldFlow && !profile?.role) ||
                            (isNewFlow && !profile?.role && !profile?.onboarding_user_type));
    
    console.log('📊 Onboarding status check result:', {
      userId: user.id,
      hasProfile: !!profile,
      role: profile?.role,
      onboardingCompleted: profile?.onboarding_completed,
      subscriptionTier: profile?.subscription_tier,
      subscriptionStatus: profile?.subscription_status,
      hasActiveSubscription,
      needsOnboarding,
      currentStep: profile?.onboarding_step
    });

    return NextResponse.json({
      success: true,
      needsOnboarding,
      profile: profile || null,
      onboarding: {
        completed: profile?.onboarding_completed || false,
        step: profile?.onboarding_step || 'welcome',  // NEW: Default to welcome screen
        profileCompleted: profile?.profile_completed || false
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error checking onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
