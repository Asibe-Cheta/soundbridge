import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET user preferences
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user is requesting their own preferences
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Can only access your own preferences' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get user preferences from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferred_event_distance')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user preferences:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: profileError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        preferences: {
          preferred_event_distance: profile.preferred_event_distance || 25
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in GET /api/users/[userId]/preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH (update) user preferences
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user is updating their own preferences
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Can only update your own preferences' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { preferred_event_distance } = body;

    // Validate preferred_event_distance if provided
    if (preferred_event_distance !== undefined) {
      if (typeof preferred_event_distance !== 'number') {
        return NextResponse.json(
          { error: 'preferred_event_distance must be a number' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (preferred_event_distance < 5 || preferred_event_distance > 100) {
        return NextResponse.json(
          { error: 'preferred_event_distance must be between 5 and 100 miles' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (preferred_event_distance !== undefined) {
      updateData.preferred_event_distance = preferred_event_distance;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid preferences provided to update' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update user preferences
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('preferred_event_distance')
      .single();

    if (updateError) {
      console.error('Error updating user preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Preferences updated successfully',
        preferences: {
          preferred_event_distance: updatedProfile.preferred_event_distance
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in PATCH /api/users/[userId]/preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

