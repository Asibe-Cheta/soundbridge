import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunities/mine — Current user's posted opportunities
 * Returns live interest_count (from opportunity_interests) so count is correct even if trigger lags.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { data: posts, error } = await supabase
      .from('opportunity_posts')
      .select('id, title, type, is_active, interest_count, created_at, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('opportunity_posts select error:', error);
      return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500, headers: CORS });
    }

    if (!posts?.length) {
      return NextResponse.json({ items: [] }, { headers: CORS });
    }

    const postIds = posts.map((p) => p.id);
    const { data: counts } = await supabase
      .from('opportunity_interests')
      .select('opportunity_id')
      .in('opportunity_id', postIds);

    const countByOppId = new Map<string, number>();
    for (const row of counts ?? []) {
      const id = (row as { opportunity_id: string }).opportunity_id;
      countByOppId.set(id, (countByOppId.get(id) ?? 0) + 1);
    }

    const items = posts.map((p) => ({
      ...p,
      interest_count: countByOppId.get(p.id) ?? p.interest_count ?? 0,
    }));

    return NextResponse.json({ items }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/opportunities/mine:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
