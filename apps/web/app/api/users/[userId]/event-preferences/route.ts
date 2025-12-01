import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET user's event preferences
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log('🎪 Get Event Preferences API called for user:', userId);

    // Authentication required
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Users can only view their own preferences (or admin)
    if (user.id !== userId) {
      console.error('❌ User can only view their own preferences');
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view your own preferences' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Fetch user's event preferences with event type details
    const { data: userEventPreferences, error } = await supabase
      .from('user_event_preferences')
      .select(`
        id,
        preference_strength,
        created_at,
        updated_at,
        event_type:event_types!user_event_preferences_event_type_id_fkey(
          id,
          name,
          category,
          description,
          icon_emoji,
          is_active,
          sort_order
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user event preferences:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch event preferences', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform response to match expected format
    const eventPreferences = (userEventPreferences || []).map((pref: any) => ({
      id: pref.id,
      event_type: pref.event_type ? {
        id: pref.event_type.id,
        name: pref.event_type.name,
        category: pref.event_type.category,
        icon_emoji: pref.event_type.icon_emoji,
        description: pref.event_type.description
      } : null,
      preference_strength: pref.preference_strength,
      created_at: pref.created_at
    }));

    console.log(`✅ Fetched ${eventPreferences.length} event preferences for user ${userId}`);

    return NextResponse.json({
      success: true,
      event_preferences: eventPreferences,
      count: eventPreferences.length,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Unexpected error fetching user event preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST/UPDATE user's event preferences (replaces existing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    console.log('🎪 Save Event Preferences API called for user:', userId);

    // Authentication required
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Users can only update their own preferences
    if (user.id !== userId) {
      console.error('❌ User can only update their own preferences');
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own preferences' },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { event_type_ids } = body;

    // Validation
    if (!event_type_ids || !Array.isArray(event_type_ids)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          message: 'event_type_ids must be an array',
          details: {
            event_type_ids: ['Must be an array']
          }
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (event_type_ids.length < 2) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          message: 'At least 2 event types are required',
          details: {
            event_type_ids: ['Must contain at least 2 items']
          }
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate all event_type_ids exist and are active
    const { data: validEventTypes, error: validationError } = await supabase
      .from('event_types')
      .select('id')
      .in('id', event_type_ids)
      .eq('is_active', true);

    if (validationError) {
      console.error('❌ Error validating event types:', validationError);
      return NextResponse.json(
        { success: false, error: 'Failed to validate event types', details: validationError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const validIds = (validEventTypes || []).map((et: any) => et.id);
    const invalidIds = event_type_ids.filter((id: string) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          message: 'Some event type IDs are invalid or inactive',
          details: {
            invalid_ids: invalidIds
          }
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete existing preferences (replace strategy)
    const { error: deleteError } = await supabase
      .from('user_event_preferences')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Error deleting existing preferences:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Insert new preferences
    const eventPreferences = event_type_ids.map((event_type_id: string, index: number) => ({
      user_id: userId,
      event_type_id: event_type_id,
      preference_strength: index < 3 ? 5 : 3 // Top 3 get higher strength for future ML
    }));

    const { data: insertedPreferences, error: insertError } = await supabase
      .from('user_event_preferences')
      .insert(eventPreferences)
      .select(`
        id,
        preference_strength,
        created_at,
        event_type:event_types!user_event_preferences_event_type_id_fkey(
          id,
          name,
          category,
          description,
          icon_emoji
        )
      `);

    if (insertError) {
      console.error('❌ Error inserting preferences:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save preferences', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform response
    const formattedPreferences = (insertedPreferences || []).map((pref: any) => ({
      id: pref.id,
      event_type: pref.event_type ? {
        id: pref.event_type.id,
        name: pref.event_type.name,
        category: pref.event_type.category,
        icon_emoji: pref.event_type.icon_emoji
      } : null,
      preference_strength: pref.preference_strength,
      created_at: pref.created_at
    }));

    console.log(`✅ Updated ${formattedPreferences.length} event preferences for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Event preferences saved successfully',
      event_preferences: formattedPreferences,
      count: formattedPreferences.length,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Unexpected error updating user event preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
