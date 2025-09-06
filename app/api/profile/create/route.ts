import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Profile creation API called');
    const supabase = createServerComponentClient({ cookies });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Get request body once
    const body = await request.json();
    const { userId: bodyUserId, username, display_name, role, location, country, bio } = body;
    
    // If no user from auth, try to get userId from request body (for signup flow)
    let userId = user?.id || bodyUserId;
    
    if (!userId) {
      console.error('❌ No user ID available');
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('✅ User ID available:', userId);

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
    const email = user?.email || '';
    const firstName = user?.user_metadata?.first_name || email.split('@')[0];
    const lastName = user?.user_metadata?.last_name || '';

    const profileData = {
      id: userId,
      username: username || `${firstName}${lastName}${Math.random().toString(36).substring(2, 6)}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
      display_name: display_name || `${firstName} ${lastName}`.trim() || email.split('@')[0],
      role: (() => {
        const userRole = role || user?.user_metadata?.role || 'listener';
        // Map onboarding roles to database roles
        if (['musician', 'podcaster', 'event_promoter'].includes(userRole)) {
          return 'creator';
        }
        return 'listener';
      })(),
      location: location || user?.user_metadata?.location || 'london',
      country: country || (location?.includes('Nigeria') ? 'Nigeria' : 'UK'),
      bio: bio || '',
      onboarding_completed: false,
      onboarding_step: 'role_selection',
      selected_role: role || user?.user_metadata?.role || 'listener', // Store the onboarding role
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
    const supabase = createServerComponentClient({ cookies });

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
