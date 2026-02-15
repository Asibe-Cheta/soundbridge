import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const ACTIVE_POST_LIMITS: Record<string, number> = {
  free: 2,
  premium: 10,
  pro: 10,
  unlimited: 999,
};

function getTierLimit(tier: string): number {
  const t = (tier || 'free').toLowerCase();
  return ACTIVE_POST_LIMITS[t] ?? ACTIVE_POST_LIMITS.free;
}

/**
 * POST /api/opportunities — Create opportunity (tier limit enforced)
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      skills_needed = [],
      location,
      is_remote = false,
      date_from,
      date_to,
      budget_min,
      budget_max,
      budget_currency = 'GBP',
      visibility = 'public',
    } = body;

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'type, title, and description are required' },
        { status: 400, headers: CORS }
      );
    }
    if (!['collaboration', 'event', 'job'].includes(type)) {
      return NextResponse.json({ error: 'type must be collaboration, event, or job' }, { status: 400, headers: CORS });
    }
    if (title.length < 5 || title.length > 120) {
      return NextResponse.json({ error: 'title must be between 5 and 120 characters' }, { status: 400, headers: CORS });
    }
    if (description.length < 20 || description.length > 1000) {
      return NextResponse.json({ error: 'description must be between 20 and 1000 characters' }, { status: 400, headers: CORS });
    }
    if (visibility && !['public', 'connections'].includes(visibility)) {
      return NextResponse.json({ error: 'visibility must be public or connections' }, { status: 400, headers: CORS });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier || 'free').toLowerCase();
    const limit = getTierLimit(tier);

    const { count, error: countErr } = await supabase
      .from('opportunity_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (!countErr && count !== null && count >= limit) {
      return NextResponse.json(
        {
          error: 'active_post_limit_reached',
          current_count: count,
          limit,
          upgrade_required: true,
          message: `Free accounts can have ${limit} active opportunities. Upgrade to Premium for 10.`,
        },
        { status: 403, headers: CORS }
      );
    }

    const { data: row, error } = await supabase
      .from('opportunity_posts')
      .insert({
        user_id: user.id,
        type,
        title: title.trim(),
        description: description.trim(),
        skills_needed: Array.isArray(skills_needed) ? skills_needed : [],
        location: location?.trim() || null,
        is_remote: !!is_remote,
        date_from: date_from || null,
        date_to: date_to || null,
        budget_min: budget_min != null ? Number(budget_min) : null,
        budget_max: budget_max != null ? Number(budget_max) : null,
        budget_currency: budget_currency || 'GBP',
        visibility: visibility || 'public',
      })
      .select()
      .single();

    if (error) {
      console.error('Opportunity insert error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create opportunity' }, { status: 500, headers: CORS });
    }
    return NextResponse.json(row, { status: 201, headers: CORS });
  } catch (e) {
    console.error('POST /api/opportunities:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

/**
 * GET /api/opportunities — Recommended feed (RPC)
 * Query: limit=20, offset=0, type=collaboration|event|job (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);
    const offset = Number(searchParams.get('offset')) || 0;
    const type = searchParams.get('type') || null;

    const { data: items, error } = await supabase.rpc('get_recommended_opportunities', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      p_type: type,
    });

    if (error) {
      console.error('get_recommended_opportunities RPC error:', error);
      return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500, headers: CORS });
    }

    const total = (items?.length ?? 0) + offset;
    return NextResponse.json(
      { items: items ?? [], total, has_more: (items?.length ?? 0) === limit },
      { headers: CORS }
    );
  } catch (e) {
    console.error('GET /api/opportunities:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
