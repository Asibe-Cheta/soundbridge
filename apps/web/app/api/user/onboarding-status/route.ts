import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { withAuthTimeout, withQueryTimeout, logPerformance, createErrorResponse } from '@/lib/api-helpers';

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
  const startTime = Date.now();

  try {
    console.log('🔍 Onboarding Status API called');

    // Use unified authentication helper with timeout (supports both cookies and bearer tokens)
    const { supabase, user, error: authError, mode } = await withAuthTimeout(
      getSupabaseRouteClient(request, true),
      5000
    );

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError, 'Auth mode:', mode);
      logPerformance('/api/user/onboarding-status', startTime);
      return NextResponse.json(
        { success: false, error: 'Authentication required - no valid session found' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get user profile with timeout protection
    const { data: profile, error: profileError } = await withQueryTimeout(
      supabase
        .from('profiles')
        .select('id, username, display_name, role, bio, location, country, genres, avatar_url, collaboration_enabled, min_notice_days, auto_decline_unavailable, social_links, onboarding_completed, onboarding_step, onboarding_user_type, profile_completed, subscription_tier, subscription_status, preferred_event_types')
        .eq('id', user.id)
        .maybeSingle(),
      5000
    ) as any;

    // If no profile exists, return needs onboarding
    if (!profile) {
      console.log('⚠️ No profile found for user:', user.id);
      logPerformance('/api/user/onboarding-status', startTime);
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
      logPerformance('/api/user/onboarding-status', startTime);
      return NextResponse.json(
        createErrorResponse('Failed to fetch profile', {
          needsOnboarding: true,
          profile: null,
          onboarding: { completed: false, step: 'welcome', profileCompleted: false }
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Authoritative cross-platform gate: onboarding is complete iff profiles.onboarding_completed is true.
    const onboardingCompleted = profile?.onboarding_completed === true;
    const needsOnboarding = !onboardingCompleted;
    
    console.log('📊 Onboarding status check result:', {
      userId: user.id,
      hasProfile: !!profile,
      role: profile?.role,
      onboardingCompleted,
      needsOnboarding,
      currentStep: profile?.onboarding_step
    });

    logPerformance('/api/user/onboarding-status', startTime);

    return NextResponse.json({
      success: true,
      needsOnboarding,
      profile: profile || null,
      onboarding: {
        completed: onboardingCompleted,
        step: profile?.onboarding_step || 'welcome',  // NEW: Default to welcome screen
        profileCompleted: profile?.profile_completed || false
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error checking onboarding status:', error);
    logPerformance('/api/user/onboarding-status', startTime);
    return NextResponse.json(
      createErrorResponse('Internal server error', {
        needsOnboarding: true,
        profile: null,
        onboarding: { completed: false, step: 'welcome', profileCompleted: false }
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}
