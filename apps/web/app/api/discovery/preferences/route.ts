import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { MAX_MOOD_TAGS_PER_TRACK, MOOD_TAG_OPTIONS } from '@/src/lib/discovery-intelligence';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_moods')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        success: true,
        preferred_moods: data?.preferred_moods || [],
        options: MOOD_TAG_OPTIONS,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[discovery/preferences GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const raw = Array.isArray(body.preferred_moods) ? body.preferred_moods : [];
    const preferred_moods = raw
      .filter((m: unknown) => typeof m === 'string' && MOOD_TAG_OPTIONS.includes(m as (typeof MOOD_TAG_OPTIONS)[number]))
      .slice(0, MAX_MOOD_TAGS_PER_TRACK);

    const { error } = await supabase
      .from('profiles')
      .update({ preferred_moods: preferred_moods.length ? preferred_moods : null })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, preferred_moods }, { headers: corsHeaders });
  } catch (e) {
    console.error('[discovery/preferences PUT]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
