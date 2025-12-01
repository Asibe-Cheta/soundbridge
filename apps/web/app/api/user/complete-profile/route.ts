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
    console.log('🔧 Complete Profile API called');

    // Use unified authentication helper (supports both cookie and bearer token)
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
    console.log('📝 Profile data received:', Object.keys(body));

    // Validate required fields
    const { role, display_name } = body;
    if (!role || !display_name) {
      return NextResponse.json(
        { success: false, error: 'Role and display_name are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Map frontend role values to database enum values
    // Frontend: 'musician', 'podcaster', 'event_promoter' -> Database: 'creator'
    // Frontend: 'listener' -> Database: 'listener'
    const databaseRole = (role === 'listener') ? 'listener' : 'creator';

    // Validate onboarding_user_type if provided
    // Values: 'music_creator', 'podcast_creator', 'industry_professional', 'music_lover', null
    const onboardingUserType = body.onboarding_user_type;
    if (onboardingUserType !== undefined) {
      const validUserTypes = ['music_creator', 'podcast_creator', 'industry_professional', 'music_lover', null];
      if (!validUserTypes.includes(onboardingUserType)) {
        console.warn('⚠️ Invalid onboarding_user_type:', onboardingUserType);
      }
    }

    // Prepare update data
    const updateData: any = {
      // Basic profile fields
      role: databaseRole,
      display_name: display_name,
      bio: body.bio || null,
      country: body.country || null,
      genres: body.genres || null,
      avatar_url: body.avatar_url || null,
      
      // Creator-specific fields
      collaboration_enabled: body.collaboration_enabled || false,
      min_notice_days: body.min_notice_days || 7,
      auto_decline_unavailable: body.auto_decline_unavailable !== undefined ? body.auto_decline_unavailable : true,
      social_links: body.social_links || null,
      
      // NEW: Support onboarding_user_type from new flow
      onboarding_user_type: onboardingUserType !== undefined ? onboardingUserType : null,
      
      // Onboarding completion
      onboarding_completed: true,
      onboarding_step: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      profile_completed: true,
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Updating profile with data:', Object.keys(updateData));

    // Check if profile exists first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    let updatedProfile;

    if (!existingProfile) {
      // Profile doesn't exist, create it
      console.log('⚠️ Profile does not exist for user, creating it:', user.id);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: `user${user.id.substring(0, 8)}`,
          ...updateData,
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
      // Profile exists, update it
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update profile', details: updateError.message },
          { status: 500, headers: corsHeaders }
        );
      }
      
      updatedProfile = data;
    }

    console.log('✅ Profile updated successfully for user:', user.id);
    console.log('📊 Updated profile role:', updatedProfile.role);

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully',
      profile: updatedProfile
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error completing profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
