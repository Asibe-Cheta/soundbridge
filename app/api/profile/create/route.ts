import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Profile creation API called');
    const supabase = createServiceClient();
    
    // Get request body
    const body = await request.json();
    const { userId, username, display_name, role, location, country, bio } = body;
    
    if (!userId) {
      console.error('❌ No user ID provided');
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('✅ User ID provided:', userId);

    // Verify the user exists in auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      console.error('❌ User not found in auth.users:', authError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }

    console.log('✅ User verified in auth.users:', authUser.user.id);

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    // Use provided data or fallback to user metadata
    const email = authUser.user.email || '';
    const firstName = authUser.user.user_metadata?.first_name || email.split('@')[0];
    const lastName = authUser.user.user_metadata?.last_name || '';

    const profileData = {
      id: userId,
      username: username || `${firstName}${lastName}${Math.random().toString(36).substring(2, 6)}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
      display_name: display_name || `${firstName} ${lastName}`.trim() || email.split('@')[0],
      role: (() => {
        const userRole = role || authUser.user.user_metadata?.role || 'listener';
        // Map onboarding roles to database roles
        if (['musician', 'podcaster', 'event_promoter'].includes(userRole)) {
          return 'creator';
        }
        return 'listener';
      })(),
      location: location || authUser.user.user_metadata?.location || 'london',
      country: country || (location?.includes('Nigeria') ? 'Nigeria' : 'UK'),
      bio: bio || '',
      onboarding_completed: false,
      onboarding_step: 'role_selection',
      selected_role: role || authUser.user.user_metadata?.role || 'listener', // Store the onboarding role
      profile_completed: false,
      first_action_completed: false,
      onboarding_skipped: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating profile with data:', profileData);

    // Create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile
    });

  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist
      return NextResponse.json({
        exists: false,
        message: 'Profile does not exist'
      });
    }

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to check profile', details: profileError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      profile
    });

  } catch (error) {
    console.error('Profile check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
