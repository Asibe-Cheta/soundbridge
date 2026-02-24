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
      .select('id, title, type, is_active, interest_count, created_at, expires_at, gig_type, urgent_status, skill_required, date_needed, payment_amount, payment_currency, selected_provider_id')
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

    const urgentIds = (posts ?? []).filter((p: { gig_type?: string }) => p.gig_type === 'urgent').map((p: { id: string }) => p.id);
    let responseCounts: Map<string, { total: number; accepted: number }> = new Map();
    let projectByGig: Map<string, string> = new Map();
    if (urgentIds.length > 0) {
      const service = await import('@/src/lib/supabase').then((m) => m.createServiceClient());
      const { data: respRows } = await service
        .from('gig_responses')
        .select('gig_id, status')
        .in('gig_id', urgentIds);
      for (const r of respRows ?? []) {
        const row = r as { gig_id: string; status: string };
        const cur = responseCounts.get(row.gig_id) ?? { total: 0, accepted: 0 };
        cur.total += 1;
        if (row.status === 'accepted') cur.accepted += 1;
        responseCounts.set(row.gig_id, cur);
      }
      const { data: projs } = await service
        .from('opportunity_projects')
        .select('id, opportunity_id')
        .in('opportunity_id', urgentIds);
      for (const pr of projs ?? []) {
        const row = pr as { id: string; opportunity_id: string };
        projectByGig.set(row.opportunity_id, row.id);
      }
    }

    const items = posts.map((p: Record<string, unknown>) => {
      const base = { ...p, interest_count: countByOppId.get(p.id as string) ?? (p.interest_count as number) ?? 0 };
      if (p.gig_type === 'urgent') {
        const counts = responseCounts.get(p.id as string);
        (base as Record<string, unknown>).response_count = counts?.total ?? 0;
        (base as Record<string, unknown>).accepted_count = counts?.accepted ?? 0;
        (base as Record<string, unknown>).project_id = projectByGig.get(p.id as string) ?? null;
      }
      return base;
    });

    return NextResponse.json({ items }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/opportunities/mine:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
