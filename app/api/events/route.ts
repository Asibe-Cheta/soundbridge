import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventData = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'event_date', 'location', 'category'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate category
    const validCategories = [
      'Christian', 'Secular', 'Carnival', 'Gospel', 'Hip-Hop',
      'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop', 'Other'
    ];

    if (!validCategories.includes(eventData.category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate date
    const eventDate = new Date(eventData.event_date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid event date' },
        { status: 400 }
      );
    }

    // Check if event is in the past
    if (eventDate < new Date()) {
      return NextResponse.json(
        { error: 'Event date cannot be in the past' },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (eventData.price_gbp && (isNaN(eventData.price_gbp) || eventData.price_gbp < 0)) {
      return NextResponse.json(
        { error: 'Invalid GBP price' },
        { status: 400 }
      );
    }

    if (eventData.price_ngn && (isNaN(eventData.price_ngn) || eventData.price_ngn < 0)) {
      return NextResponse.json(
        { error: 'Invalid NGN price' },
        { status: 400 }
      );
    }

    // Validate max attendees if provided
    if (eventData.max_attendees && (isNaN(eventData.max_attendees) || eventData.max_attendees < 1)) {
      return NextResponse.json(
        { error: 'Invalid max attendees' },
        { status: 400 }
      );
    }

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        creator_id: user.id,
        current_attendees: 0
      }])
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
        { error: 'Failed to create event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Event creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

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
        { status: 500 }
      );
    }

    // Transform events data
    const transformedEvents = events?.map(event => ({
      ...event,
      attendeeCount: event.attendees?.length || 0,
      isAttending: event.attendees?.some(a => a.status === 'attending') || false,
      isInterested: event.attendees?.some(a => a.status === 'interested') || false,
      formattedDate: formatEventDate(event.event_date),
      formattedPrice: formatPrice(event.price_gbp, event.price_ngn),
      isFeatured: isFeaturedEvent(event),
      rating: calculateEventRating(event)
    })) || [];

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      total: transformedEvents.length
    });
  } catch (error) {
    console.error('Events fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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

function isFeaturedEvent(event: any): boolean {
  return (event.current_attendees || 0) > 100;
}

function calculateEventRating(event: any): number {
  return 4.5 + Math.random() * 0.5;
} 