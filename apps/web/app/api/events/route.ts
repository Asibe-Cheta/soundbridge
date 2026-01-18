import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const eventData = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'event_date', 'location', 'category'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Validate location data for notifications
    if (!eventData.city && !eventData.latitude) {
      return NextResponse.json(
        { error: 'Either city or coordinates (latitude/longitude) are required for notifications' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate category - Support both web and mobile app categories
    const validCategories = [
      // Mobile app categories
      'Music Concert', 'Birthday Party', 'Carnival', 'Get Together', 'Music Karaoke',
      'Comedy Night', 'Gospel Concert', 'Instrumental', 'Jazz Room', 'Workshop',
      'Conference', 'Festival', 'Other',
      // Legacy web categories (for backward compatibility)
      'Christian', 'Secular', 'Gospel', 'Hip-Hop', 'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop'
    ];

    if (!validCategories.includes(eventData.category)) {
      return NextResponse.json(
        { error: 'Invalid category', validCategories },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate date
    const eventDate = new Date(eventData.event_date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid event date' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if event is in the past
    if (eventDate < new Date()) {
      return NextResponse.json(
        { error: 'Event date cannot be in the past' },
        { status: 400, headers: corsHeaders }
      );
    }

    const priceGbp = Number(eventData.price_gbp ?? 0);
    const priceNgn = Number(eventData.price_ngn ?? 0);

    // Validate price if provided
    if (eventData.price_gbp && (isNaN(priceGbp) || priceGbp < 0)) {
      return NextResponse.json(
        { error: 'Invalid GBP price' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (eventData.price_ngn && (isNaN(priceNgn) || priceNgn < 0)) {
      return NextResponse.json(
        { error: 'Invalid NGN price' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate max attendees if provided
    if (eventData.max_attendees && (isNaN(eventData.max_attendees) || eventData.max_attendees < 1)) {
      return NextResponse.json(
        { error: 'Invalid max attendees' },
        { status: 400, headers: corsHeaders }
      );
    }

    const isPaidEvent = eventData.is_free === false || priceGbp > 0 || priceNgn > 0;
    if (isPaidEvent) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, subscription_tier')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'Failed to verify creator status' },
          { status: 500, headers: corsHeaders }
        );
      }

      if (profile.role !== 'creator') {
        return NextResponse.json(
          {
            error: 'CREATOR_REQUIRED',
            message: 'You must be a creator to host paid events. Switch to a creator account first.',
          },
          { status: 403, headers: corsHeaders }
        );
      }

      const subscriptionTier = String(profile.subscription_tier || 'free').toLowerCase();
      if (!['premium', 'unlimited'].includes(subscriptionTier)) {
        return NextResponse.json(
          {
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'You need a Premium or Unlimited subscription to host paid events.',
          },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Map mobile categories to database enum values
    const categoryMap: Record<string, string> = {
      'Music Concert': 'Secular',
      'Birthday Party': 'Other',
      'Carnival': 'Carnival',
      'Get Together': 'Other',
      'Music Karaoke': 'Secular',
      'Comedy Night': 'Other',
      'Gospel Concert': 'Gospel',
      'Instrumental': 'Classical',
      'Jazz Room': 'Jazz',
      'Workshop': 'Other',
      'Conference': 'Other',
      'Festival': 'Carnival',
      'Other': 'Other',
    };

    const normalizedCategory = categoryMap[eventData.category] || eventData.category;

    // Prepare event data with all location fields
    const insertData: any = {
      title: eventData.title,
      description: eventData.description || null,
      event_date: eventData.event_date,
      location: eventData.location,
      venue: eventData.venue || null,
      category: normalizedCategory,
      creator_id: user.id,
      current_attendees: 0,
      // Location fields for notifications
      city: eventData.city || null,
      country: eventData.country || null,
      latitude: eventData.latitude || null,
      longitude: eventData.longitude || null,
      // Pricing (only fields that exist in the events table)
      price_gbp: eventData.price_gbp || null,
      price_ngn: eventData.price_ngn || null,
      // Other fields
      max_attendees: eventData.max_attendees || null,
      image_url: eventData.image_url || null
    };

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert([insertData])
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          banner_url
        )
      `)
      .single();

    if (createError) {
      console.error('Event creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create event', details: createError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      event
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Event creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getSupabaseRouteClient(request, false);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange');
    const priceRange = searchParams.get('priceRange');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          banner_url
        ),
        attendees:event_attendees(
          user_id,
          status,
          created_at
        )
      `)
      .order('event_date', { ascending: true });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (location && location !== 'all') {
      query = query.ilike('location', `%${location}%`);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'next-month':
          startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        default:
          startDate = now;
      }

      query = query.gte('event_date', startDate.toISOString());
    }

    if (priceRange && priceRange !== 'all') {
      switch (priceRange) {
        case 'free':
          query = query.eq('price_gbp', 0).eq('price_ngn', 0);
          break;
        case 'low':
          query = query.lt('price_gbp', 20);
          break;
        case 'medium':
          query = query.gte('price_gbp', 20).lte('price_gbp', 50);
          break;
        case 'high':
          query = query.gt('price_gbp', 50);
          break;
      }
    }

    // Only show future events by default
    query = query.gte('event_date', new Date().toISOString());

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, error } = await query;

    if (error) {
      console.error('Events fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform events data
    const transformedEvents = events?.map(event => ({
      ...event,
      attendeeCount: event.attendees?.length || 0,
      isAttending: event.attendees?.some((a: { status: string }) => a.status === 'attending') || false,
      isInterested: event.attendees?.some((a: { status: string }) => a.status === 'interested') || false,
      formattedDate: formatEventDate(event.event_date),
      formattedPrice: formatPrice(event.price_gbp, event.price_ngn),
      isFeatured: isFeaturedEvent(event),
      rating: calculateEventRating(event)
    })) || [];

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      total: transformedEvents.length
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Events fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper functions
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 7) {
    return `${diffDays} days`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

function formatPrice(priceGbp: number | null, priceNgn: number | null): string {
  if (priceGbp === 0 && priceNgn === 0) {
    return 'Free Entry';
  }

  if (priceGbp && priceGbp > 0) {
    return `£${priceGbp}`;
  }

  if (priceNgn && priceNgn > 0) {
    return `₦${priceNgn.toLocaleString()}`;
  }

  return 'Free Entry';
}

function isFeaturedEvent(event: { current_attendees?: number }): boolean {
  return (event.current_attendees || 0) > 100;
}

function calculateEventRating(event: { current_attendees?: number }): number {
  return 4.5 + Math.random() * 0.5;
} 