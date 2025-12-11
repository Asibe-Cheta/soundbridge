import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/profile/custom-username
 * Check if user can change their custom username
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user can change username
    const { data, error } = await supabase.rpc('can_change_custom_username', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error checking custom username eligibility:', error);
      return NextResponse.json(
        { error: 'Failed to check username eligibility', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const result = data[0];

    // Get current username
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_username, subscription_tier')
      .eq('id', user.id)
      .single();

    return NextResponse.json(
      {
        can_change: result.can_change,
        reason: result.reason,
        current_username: profile?.custom_username,
        subscription_tier: profile?.subscription_tier,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in custom-username GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/profile/custom-username
 * Set or update custom username (Premium/Unlimited only)
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9-]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters, alphanumeric and hyphens only' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for reserved usernames
    const reservedUsernames = [
      'admin', 'api', 'app', 'blog', 'dashboard', 'discover', 'events', 'explore',
      'feed', 'help', 'home', 'login', 'logout', 'pricing', 'privacy', 'profile',
      'search', 'settings', 'signup', 'soundbridge', 'support', 'terms', 'upload',
      'user', 'users', 'about', 'contact', 'legal', 'moderator', 'mod', 'root',
      'system', 'test', 'null', 'undefined', 'www'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
      return NextResponse.json(
        { error: 'This username is reserved and cannot be used' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update username using database function
    const { data, error } = await supabase.rpc('update_custom_username', {
      p_user_id: user.id,
      p_username: username,
    });

    if (error) {
      console.error('Error updating custom username:', error);
      return NextResponse.json(
        { error: 'Failed to update username', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const result = data[0];

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        username,
        profile_url: `https://soundbridge.live/${username}`,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in custom-username POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/profile/custom-username/check-availability
 * Check if a username is available
 */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate format
    if (!/^[a-zA-Z0-9-]{3,30}$/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          reason: 'Username must be 3-30 characters, alphanumeric and hyphens only',
        },
        { headers: corsHeaders }
      );
    }

    // Check if taken
    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('custom_username', username)
      .neq('id', user.id) // Exclude current user
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking username availability:', error);
      return NextResponse.json(
        { error: 'Failed to check availability', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const available = !existingUser;

    return NextResponse.json(
      {
        available,
        reason: available ? 'Username is available' : 'Username is already taken',
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in custom-username check availability:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
