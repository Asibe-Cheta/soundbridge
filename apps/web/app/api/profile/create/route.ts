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

    // Verify the user exists in auth.users table with retry mechanism
    // Single auth check - no retries to prevent rate limiting
    console.log('🔍 Looking up user in auth.users...');
    
    const result = await supabase.auth.admin.getUserById(userId);
    const authUser = result.data;
    const authError = result.error;
    
    if (authUser?.user && !authError) {
      console.log('✅ User verified in auth.users:', authUser.user.id);
      console.log('✅ User email:', authUser.user.email);
    } else {
      console.error('❌ User not found in auth.users:', authError);
      console.log('🔄 Proceeding with minimal profile creation using provided data only...');
      
      // Fallback: Create profile with minimal data from request body
      const profileData = {
        id: userId,
        username: username || `user${Math.random().toString(36).substring(2, 8)}`,
        display_name: display_name || 'New User',
      role: (() => {
        // Map onboarding roles to database roles
        const userRole = role || 'listener';
        if (['musician', 'podcaster', 'event_promoter'].includes(userRole)) {
          console.log(`✅ Mapping role '${userRole}' to 'creator'`);
          return 'creator';
        }
        console.log(`✅ Mapping role '${userRole}' to 'listener'`);
        return 'listener';
      })(),
        location: location || 'london',
        country: country || (location?.includes('Nigeria') ? 'Nigeria' : 'UK'),
        bio: bio || '',
        onboarding_completed: false,
        onboarding_step: 'role_selection',
        selected_role: role || 'listener',
        profile_completed: false,
        first_action_completed: false,
        onboarding_skipped: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating profile with fallback data:', profileData);

      // Create the profile with fallback data
      const { data: profile, error: profileError } = await (supabase
        .from('profiles') as any)
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error (fallback):', profileError);
        return NextResponse.json(
          { error: 'Failed to create profile', details: profileError },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Profile created successfully (fallback mode)',
        profile
      });
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId as any)
      .single() as { data: any; error: any };

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
          console.log(`✅ Mapping role '${userRole}' to 'creator'`);
          return 'creator';
        }
        console.log(`✅ Mapping role '${userRole}' to 'listener'`);
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
    const { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
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
      .eq('id', user.id as any)
      .single() as { data: any; error: any };

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
