import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import type { EventAnalyticsRow } from '@/src/lib/event-analytics';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** GET /api/events/[id]/analytics — creator-only via RLS */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, creator_id')
      .eq('id', eventId)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
    }

  if (event.creator_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const { data: analytics, error } = await supabase
      .from('event_analytics')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const row = (analytics ?? {
      event_id: eventId,
      creator_id: event.creator_id,
      notifications_sent: 0,
      notifications_opened: 0,
      event_page_views: 0,
      bookmarks_count: 0,
      shares_link_count: 0,
      shares_card_count: 0,
      ticket_sales_count: 0,
      ticket_sales_revenue: 0,
      views_by_city: null,
      views_by_genre_match: null,
      notification_open_rate: null,
      peak_view_hour: null,
    }) as EventAnalyticsRow;

    const sent = row.notifications_sent ?? 0;
    const opened = row.notifications_opened ?? 0;
    const views = row.event_page_views ?? 0;
    const tickets = row.ticket_sales_count ?? 0;

    return NextResponse.json(
      {
        data: {
          ...row,
          open_rate_percent: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
          notification_to_view_rate_percent:
            sent > 0 ? Math.round((views / sent) * 1000) / 10 : 0,
          page_to_purchase_rate_percent:
            views > 0 ? Math.round((tickets / views) * 1000) / 10 : 0,
          shares_total: (row.shares_link_count ?? 0) + (row.shares_card_count ?? 0),
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[events/analytics GET]', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500, headers: corsHeaders });
  }
}
