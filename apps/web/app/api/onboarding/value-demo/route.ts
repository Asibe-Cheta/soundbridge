import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('Value Demo API called');

    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('user_type');
    const genresParam = searchParams.get('genres');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 3;

    if (isNaN(limit) || limit < 1 || limit > 10) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 10' },
        { status: 400, headers: corsHeaders }
      );
    }

    let supabase: Awaited<ReturnType<typeof getSupabaseRouteClient>>['supabase'];
    let user: Awaited<ReturnType<typeof getSupabaseRouteClient>>['user'];
    try {
      const auth = await getSupabaseRouteClient(request, false);
      supabase = auth.supabase;
      user = auth.user;
    } catch (configErr: unknown) {
      const msg = configErr instanceof Error ? configErr.message : String(configErr);
      console.error('Value demo: Supabase client init failed:', configErr);
      return NextResponse.json(
        { success: false, error: 'Service unavailable', details: msg },
        { status: 503, headers: corsHeaders }
      );
    }

    const genres = genresParam ? genresParam.split(',').map((g) => g.trim()).filter(Boolean) : [];

    const query = supabase
      .from('profiles')
      .select(
        `
        id,
        username,
        display_name,
        avatar_url,
        location,
        country,
        bio,
        role,
        followers_count,
        total_plays,
        genre,
        genres,
        trusted_flagger
      `
      )
      .eq('role', 'creator')
      .is('deleted_at', null)
      .or('banned.is.null,banned.eq.false')
      .order('followers_count', { ascending: false })
      .limit(limit * 4);

    if (userType) {
      // Reserved for future user_type-specific ranking
    }

    const { data: profilesRaw, error: profilesError } = await query;

    if (profilesError) {
      console.error('Error fetching creator profiles:', profilesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch creator profiles', details: profilesError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const excludeId = user?.id;

    function profileMatchesGenres(profile: Record<string, unknown>): boolean {
      if (genres.length === 0) return true;
      const g = profile.genres;
      const single = profile.genre;
      const fromJson = Array.isArray(g)
        ? g.map((x) => String(x).toLowerCase())
        : typeof g === 'string'
          ? [g.toLowerCase()]
          : [];
      const fromSingle = single ? [String(single).toLowerCase()] : [];
      const hay = new Set([...fromJson, ...fromSingle]);
      return genres.some((x) => hay.has(x.toLowerCase()));
    }

    let pool = (profilesRaw || []).filter(
      (p: { username?: string; id?: string }) =>
        p?.username &&
        String(p.username).trim().length > 0 &&
        (!excludeId || p.id !== excludeId)
    );

    let picked =
      genres.length > 0 ? pool.filter((p) => profileMatchesGenres(p as Record<string, unknown>)) : [...pool];
    if (picked.length < limit && genres.length > 0) {
      for (const p of pool) {
        if (picked.length >= limit) break;
        if (!picked.includes(p)) picked.push(p);
      }
    }

    const mapProfile = (profile: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      location: string | null;
      country: string | null;
      bio: string | null;
      role: string;
      followers_count: number | null;
      trusted_flagger: boolean | null;
    }) => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      location: profile.location || null,
      country: profile.country || null,
      bio: profile.bio || null,
      role: profile.role,
      stats: {
        connections: profile.followers_count || 0,
        tracks: 0,
        verified: profile.trusted_flagger === true,
      },
    });

    const creators = picked.slice(0, limit).map(mapProfile);

    console.log('Value demo creators fetched:', creators.length);

    return NextResponse.json(
      {
        success: true,
        creators,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching value demo:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
