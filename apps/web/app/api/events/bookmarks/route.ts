import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** GET /api/events/bookmarks — saved events for current user */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: bookmarks, error } = await supabase
      .from('event_bookmarks')
      .select(
        `
        id,
        bookmarked_at,
        event:events (
          id,
          title,
          description,
          event_date,
          location,
          venue,
          category,
          image_url,
          price_gbp,
          price_ngn,
          creator_id,
          creator:profiles!events_creator_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `,
      )
      .eq('user_id', user.id)
      .order('bookmarked_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const events = (bookmarks ?? [])
      .map((row) => row.event)
      .filter(Boolean);

    return NextResponse.json({ data: events }, { headers: corsHeaders });
  } catch (error) {
    console.error('[events/bookmarks GET]', error);
    return NextResponse.json({ error: 'Failed to load bookmarks' }, { status: 500, headers: corsHeaders });
  }
}
