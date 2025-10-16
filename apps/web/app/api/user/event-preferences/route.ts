import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/user/event-preferences
 * Get user's event notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's event preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_event_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      console.error('Error fetching event preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: prefsError.message },
        { status: 500 }
      );
    }

    // If no preferences exist, create default ones
    if (!preferences) {
      const { data: newPrefs, error: createError } = await supabase
        .from('user_event_preferences')
        .insert({
          user_id: user.id,
          push_notifications_enabled: true,
          email_notifications_enabled: false,
          notification_radius_km: 25,
          event_categories: ['Christian', 'Gospel', 'Afrobeat'],
          notification_advance_days: 7,
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          max_notifications_per_week: 3,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default preferences:', createError);
        return NextResponse.json(
          { error: 'Failed to create preferences', details: createError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: newPrefs,
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error in GET /api/user/event-preferences:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/event-preferences
 * Create or update user's event notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const {
      push_notifications_enabled,
      email_notifications_enabled,
      notification_radius_km,
      event_categories,
      notification_advance_days,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      max_notifications_per_week,
      use_device_location,
      custom_latitude,
      custom_longitude,
      custom_location_name,
    } = body;

    // Validate notification_radius_km
    if (
      notification_radius_km !== undefined &&
      ![5, 10, 25, 50, 100, 200].includes(notification_radius_km)
    ) {
      return NextResponse.json(
        { error: 'Invalid notification_radius_km. Must be one of: 5, 10, 25, 50, 100, 200' },
        { status: 400 }
      );
    }

    // Validate notification_advance_days
    if (
      notification_advance_days !== undefined &&
      ![1, 3, 7, 14, 30].includes(notification_advance_days)
    ) {
      return NextResponse.json(
        { error: 'Invalid notification_advance_days. Must be one of: 1, 3, 7, 14, 30' },
        { status: 400 }
      );
    }

    // Validate max_notifications_per_week
    if (
      max_notifications_per_week !== undefined &&
      (max_notifications_per_week < 1 || max_notifications_per_week > 10)
    ) {
      return NextResponse.json(
        { error: 'Invalid max_notifications_per_week. Must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Validate event_categories (must match event_category enum)
    const validCategories = [
      'Christian',
      'Secular',
      'Carnival',
      'Gospel',
      'Hip-Hop',
      'Afrobeat',
      'Jazz',
      'Classical',
      'Rock',
      'Pop',
      'Other',
    ];

    if (event_categories && Array.isArray(event_categories)) {
      const invalidCategories = event_categories.filter(
        (cat: string) => !validCategories.includes(cat)
      );
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid event categories: ${invalidCategories.join(', ')}`,
            valid_categories: validCategories,
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      user_id: user.id,
    };

    if (push_notifications_enabled !== undefined) {
      updateData.push_notifications_enabled = push_notifications_enabled;
    }
    if (email_notifications_enabled !== undefined) {
      updateData.email_notifications_enabled = email_notifications_enabled;
    }
    if (notification_radius_km !== undefined) {
      updateData.notification_radius_km = notification_radius_km;
    }
    if (event_categories !== undefined) {
      updateData.event_categories = event_categories;
    }
    if (notification_advance_days !== undefined) {
      updateData.notification_advance_days = notification_advance_days;
    }
    if (quiet_hours_enabled !== undefined) {
      updateData.quiet_hours_enabled = quiet_hours_enabled;
    }
    if (quiet_hours_start !== undefined) {
      updateData.quiet_hours_start = quiet_hours_start;
    }
    if (quiet_hours_end !== undefined) {
      updateData.quiet_hours_end = quiet_hours_end;
    }
    if (max_notifications_per_week !== undefined) {
      updateData.max_notifications_per_week = max_notifications_per_week;
    }
    if (use_device_location !== undefined) {
      updateData.use_device_location = use_device_location;
    }
    if (custom_latitude !== undefined) {
      updateData.custom_latitude = custom_latitude;
    }
    if (custom_longitude !== undefined) {
      updateData.custom_longitude = custom_longitude;
    }
    if (custom_location_name !== undefined) {
      updateData.custom_location_name = custom_location_name;
    }

    // Upsert preferences (insert if not exists, update if exists)
    const { data: preferences, error: upsertError } = await supabase
      .from('user_event_preferences')
      .upsert(updateData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting event preferences:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save preferences', details: upsertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Event preferences saved successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Event preferences saved successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/user/event-preferences:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/event-preferences
 * Update specific fields in user's event notification preferences
 */
export async function PUT(request: NextRequest) {
  // For partial updates, use POST with only the fields to update
  // This endpoint is just an alias for POST
  return POST(request);
}

