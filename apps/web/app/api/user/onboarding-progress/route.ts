import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Onboarding Progress API called');

    // Use unified authentication helper (supports both cookies and bearer tokens)
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const {
      currentStep,
      selectedRole,
      profileCompleted,
      firstActionCompleted,
      userId,
      userType, // onboarding_user_type from new flow
      onboarding_user_type,
      preferred_event_types, // Event organiser: array of event type IDs
      event_reach // Event organiser: local | regional | national | international
    } = body;

    // Validate required fields
    if (!userId || userId !== user.id) {
      console.error('❌ Invalid user ID');
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update fields based on what's provided
    if (currentStep) updateData.onboarding_step = currentStep;
    if (selectedRole) updateData.role = selectedRole;
    if (profileCompleted !== undefined) updateData.profile_completed = profileCompleted;
    if (firstActionCompleted !== undefined) updateData.first_action_completed = firstActionCompleted;

    // onboarding_user_type: include event_organiser (WEB_TEAM_ONBOARDING_ENHANCEMENTS.MD)
    const onboardingUserType = userType || onboarding_user_type;
    if (onboardingUserType !== undefined) {
      const validUserTypes = ['music_creator', 'podcast_creator', 'industry_professional', 'music_lover', 'event_organiser', null];
      if (validUserTypes.includes(onboardingUserType)) {
        updateData.onboarding_user_type = onboardingUserType;
      } else {
        console.warn('⚠️ Invalid onboarding_user_type:', onboardingUserType);
      }
    }

    if (preferred_event_types !== undefined && Array.isArray(preferred_event_types)) {
      updateData.preferred_event_types = preferred_event_types;
    }
    if (event_reach !== undefined && ['local', 'regional', 'national', 'international'].includes(event_reach)) {
      updateData.event_reach = event_reach;
    }

    console.log('🔄 Updating onboarding progress:', updateData);

    // Check if profile exists first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    let updatedProfile;

    if (!existingProfile) {
      console.log('⚠️ Profile does not exist for user, creating it:', user.id);

      // Create profile with the update data
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: `user${user.id.substring(0, 8)}`,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          role: 'listener',
          location: null,
          country: null,
          country_code: null,
          bio: '',
          onboarding_completed: false,
          onboarding_step: 'role_selection',
          selected_role: 'listener',
          profile_completed: false,
          first_action_completed: false,
          onboarding_skipped: false,
          onboarding_user_type: null, // NEW: Initialize onboarding_user_type
          ...updateData, // Apply the update data on top of defaults
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create profile', details: createError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      updatedProfile = newProfile;
    } else {
      // Update existing profile
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating onboarding progress:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update onboarding progress', details: updateError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      updatedProfile = data;
    }

    console.log('✅ Onboarding progress updated successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Onboarding progress updated successfully',
      profile: updatedProfile
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error updating onboarding progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}