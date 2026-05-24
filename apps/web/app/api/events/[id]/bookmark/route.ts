import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { trackEventAction } from '@/src/lib/event-analytics';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** GET — is this event bookmarked by the current user? */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ bookmarked: false }, { headers: corsHeaders });
    }

    const { data } = await supabase
      .from('event_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .maybeSingle();

    return NextResponse.json({ bookmarked: !!data }, { headers: corsHeaders });
  } catch (error) {
    console.error('[events/bookmark GET]', error);
    return NextResponse.json({ bookmarked: false }, { headers: corsHeaders });
  }
}

/** POST — bookmark event */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: existing } = await supabase
      .from('event_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ bookmarked: true }, { headers: corsHeaders });
    }

    const { error: insertError } = await supabase.from('event_bookmarks').insert({
      user_id: user.id,
      event_id: eventId,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    await trackEventAction(supabase, eventId, 'bookmark');
    return NextResponse.json({ bookmarked: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('[events/bookmark POST]', error);
    return NextResponse.json({ error: 'Failed to bookmark' }, { status: 500, headers: corsHeaders });
  }
}

/** DELETE — remove bookmark */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: existing } = await supabase
      .from('event_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      await supabase.from('event_bookmarks').delete().eq('id', existing.id);
      await trackEventAction(supabase, eventId, 'unbookmark');
    }

    return NextResponse.json({ bookmarked: false }, { headers: corsHeaders });
  } catch (error) {
    console.error('[events/bookmark DELETE]', error);
    return NextResponse.json({ error: 'Failed to unbookmark' }, { status: 500, headers: corsHeaders });
  }
}
