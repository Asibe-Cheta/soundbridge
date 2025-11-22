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
        profile_completed,
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
          step: 'role_selection',
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
    const needsOnboarding = !profile?.onboarding_completed || !profile?.role;
    
    console.log('📊 Onboarding status check result:', {
      userId: user.id,
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
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error checking onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
