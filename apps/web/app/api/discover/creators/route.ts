import { NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Discover creators — mirrors mobile fallback: profiles where role=creator, then aggregate counts.
 * Optionally uses get_creators_with_stats RPC when present and returns an array.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);

    const supabase = createServiceClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_creators_with_stats', {
      p_limit: limit,
    });

    const rpcOk =
      !rpcError &&
      Array.isArray(rpcData) &&
      rpcData.length > 0 &&
      typeof (rpcData[0] as Record<string, unknown>)?.profile === 'object' &&
      typeof (rpcData[0] as Record<string, unknown>)?.stats === 'object';

    if (rpcOk) {
      return NextResponse.json(
        { success: true, data: rpcData, source: 'rpc' },
        {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        },
      );
    }

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, location, country, genre, role, created_at')
      .eq('role', 'creator')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profErr) {
      console.error('[discover/creators] profiles', profErr);
      return NextResponse.json(
        { success: false, error: profErr.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const rows = profiles || [];
    const ids = rows.map((p) => p.id).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: [], source: 'profiles' }, { headers: corsHeaders });
    }

    const [followRes, trackRes, eventRes] = await Promise.all([
      supabase.from('follows').select('following_id').in('following_id', ids),
      supabase
        .from('audio_tracks')
        .select('creator_id, play_count, like_count')
        .eq('is_public', true)
        .in('creator_id', ids),
      supabase.from('events').select('creator_id').in('creator_id', ids),
    ]);

    const followersBy = new Map<string, number>();
    for (const r of followRes.data || []) {
      const id = r.following_id as string;
      followersBy.set(id, (followersBy.get(id) || 0) + 1);
    }

    const tracksBy = new Map<string, number>();
    const playsBy = new Map<string, number>();
    const likesBy = new Map<string, number>();
    for (const t of trackRes.data || []) {
      const id = t.creator_id as string;
      tracksBy.set(id, (tracksBy.get(id) || 0) + 1);
      playsBy.set(id, (playsBy.get(id) || 0) + (Number(t.play_count) || 0));
      likesBy.set(id, (likesBy.get(id) || 0) + (Number(t.like_count) || 0));
    }

    const eventsBy = new Map<string, number>();
    for (const e of eventRes.data || []) {
      const id = e.creator_id as string;
      eventsBy.set(id, (eventsBy.get(id) || 0) + 1);
    }

    const data = rows.map((profile) => {
      const id = profile.id;
      const fc = followersBy.get(id) || 0;
      const tc = tracksBy.get(id) || 0;
      const ec = eventsBy.get(id) || 0;
      const tp = playsBy.get(id) || 0;
      const tl = likesBy.get(id) || 0;
      return {
        profile: {
          ...profile,
          banner_url: null,
          social_links: {} as Record<string, string>,
          updated_at: profile.created_at,
          role: (profile.role || 'creator') as 'creator' | 'listener',
        },
        stats: {
          followers_count: fc,
          following_count: 0,
          tracks_count: tc,
          events_count: ec,
          total_plays: tp,
          total_likes: tl,
        },
        recent_tracks: [] as unknown[],
        upcoming_events: [] as unknown[],
      };
    });

    return NextResponse.json(
      { success: true, data, source: 'profiles' },
      {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (e: unknown) {
    console.error('[discover/creators]', e);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
