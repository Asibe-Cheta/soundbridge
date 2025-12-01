import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎪 Events by Preferences API called');

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const location = searchParams.get('location');
    const country = searchParams.get('country');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Authentication required
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Validate user_id
    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user_id or you can only query your own preferences' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's event preferences
    const { data: userPreferences, error: prefError } = await supabase
      .from('user_event_preferences')
      .select(`
        event_type:event_types!user_event_preferences_event_type_id_fkey(
          id,
          name,
          category
        )
      `)
      .eq('user_id', userId);

    if (prefError) {
      console.error('❌ Error fetching user preferences:', prefError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user preferences', details: prefError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // If user has no preferences, return empty result
    if (!userPreferences || userPreferences.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        count: 0,
        total: 0,
        message: 'No event preferences set. Set preferences to get personalized recommendations.'
      }, { headers: corsHeaders });
    }

    // Extract event type names and categories from preferences
    const preferredEventTypes = (userPreferences || [])
      .map((pref: any) => pref.event_type)
      .filter(Boolean);

    const preferredCategories = [...new Set(preferredEventTypes.map((et: any) => et.category))];
    const preferredNames = preferredEventTypes.map((et: any) => et.name.toLowerCase());

    // Build query for events
    // Note: Since events table uses category enum, we'll match by category similarity
    // For now, we'll get events that match the preferred categories
    // TODO: Add event_type_id field to events table for better matching
    
    let eventsQuery = supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        location,
        venue_name,
        city,
        country,
        cover_image_url,
        category,
        organizer_id,
        attendees_count,
        created_at
      `)
      .gte('event_date', new Date().toISOString()) // Only future events
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by location if provided
    if (location) {
      eventsQuery = eventsQuery.or(`location.ilike.%${location}%,city.ilike.%${location}%`);
    }

    // Filter by country if provided
    if (country) {
      eventsQuery = eventsQuery.eq('country', country);
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events', details: eventsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // For now, return all matching events
    // TODO: When event_type_id is added to events table, filter by matching event types
    // For now, we'll return events that match the user's preferred categories
    
    // Map events to include event_type information
    // Since we don't have event_type_id in events yet, we'll try to match by category name
    const mappedEvents = (events || []).map((event: any) => {
      // Try to find matching event type by category name similarity
      const matchingEventType = preferredEventTypes.find((et: any) => {
        const eventCategoryLower = (event.category || '').toLowerCase();
        const etNameLower = et.name.toLowerCase();
        // Simple matching - can be improved later
        return etNameLower.includes(eventCategoryLower) || eventCategoryLower.includes(etNameLower);
      });

      return {
        id: event.id,
        title: event.title,
        event_type: matchingEventType ? {
          id: matchingEventType.id,
          name: matchingEventType.name,
          category: matchingEventType.category,
          icon_emoji: null // Would need to fetch from event_types
        } : null,
        date: event.event_date,
        location: event.location || event.city,
        country: event.country,
        venue: event.venue_name,
        category: event.category,
        attendees_count: event.attendees_count || 0,
        cover_image_url: event.cover_image_url
      };
    });

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('event_date', new Date().toISOString());

    console.log(`✅ Fetched ${mappedEvents.length} events for user ${userId} based on preferences`);

    return NextResponse.json({
      success: true,
      events: mappedEvents,
      count: mappedEvents.length,
      total: totalCount || 0,
      limit,
      offset,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Unexpected error fetching events by preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
