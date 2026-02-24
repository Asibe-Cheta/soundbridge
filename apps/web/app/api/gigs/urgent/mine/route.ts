/**
 * GET /api/gigs/urgent/mine — Current user's urgent gigs (as requester)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const service = createServiceClient();
    const { data: gigs, error } = await service
      .from('opportunity_posts')
      .select('id, title, skill_required, date_needed, payment_amount, payment_currency, urgent_status, expires_at, selected_provider_id')
      .eq('user_id', user.id)
      .eq('gig_type', 'urgent')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('gigs/urgent/mine:', error);
      return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500, headers: CORS });
    }

    const list = gigs ?? [];
    const gigIds = list.map((g: { id: string }) => g.id);

    const { data: responseCounts } = gigIds.length
      ? await service.from('gig_responses').select('gig_id, status').in('gig_id', gigIds)
      : { data: [] };
    const countByGig = new Map<string, { total: number; accepted: number }>();
    for (const r of responseCounts ?? []) {
      const id = (r as { gig_id: string }).gig_id;
      if (!countByGig.has(id)) countByGig.set(id, { total: 0, accepted: 0 });
      const c = countByGig.get(id)!;
      c.total += 1;
      if ((r as { status: string }).status === 'accepted') c.accepted += 1;
    }

    const { data: projects } = gigIds.length
      ? await service.from('opportunity_projects').select('opportunity_id, id').in('opportunity_id', gigIds)
      : { data: [] };
    const projectByGig = new Map((projects ?? []).map((p: { opportunity_id: string; id: string }) => [p.opportunity_id, p.id]));

    const { data: selectedNames } =
      list.filter((g: { selected_provider_id: string | null }) => g.selected_provider_id).length
        ? await service
            .from('profiles')
            .select('id, display_name')
            .in('id', list.map((g: { selected_provider_id: string | null }) => g.selected_provider_id).filter(Boolean))
        : { data: [] };
    const nameById = new Map((selectedNames ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]));

    const data = list.map((g: Record<string, unknown>) => {
      const counts = countByGig.get(g.id as string) ?? { total: 0, accepted: 0 };
      return {
        id: g.id,
        title: g.title,
        skill_required: g.skill_required,
        date_needed: g.date_needed,
        payment_amount: g.payment_amount,
        payment_currency: g.payment_currency,
        urgent_status: g.urgent_status ?? 'searching',
        expires_at: g.expires_at,
        response_count: counts.total,
        accepted_count: counts.accepted,
        project_id: projectByGig.get(g.id as string) ?? null,
        selected_provider_name: g.selected_provider_id ? nameById.get(g.selected_provider_id as string) ?? null : null,
      };
    });

    return NextResponse.json({ success: true, data }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/gigs/urgent/mine:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
