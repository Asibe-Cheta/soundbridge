/**
 * GET /api/gigs/my — Current user's urgent gigs (as requester/poster)
 * Mobile calls this on the My Opportunities screen. Same data as GET /api/gigs/urgent/mine.
 * @see WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §2.2 (GET /api/gigs/my)
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
      .select('id, title, skill_required, genre, date_needed, duration_hours, payment_amount, payment_currency, location_address, urgent_status, payment_status, expires_at, created_at, selected_provider_id')
      .eq('user_id', user.id)
      .eq('gig_type', 'urgent')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('gigs/my:', error);
      return NextResponse.json({ success: false, error: 'Failed to load' }, { status: 500, headers: CORS });
    }

    const list = gigs ?? [];
    const gigIds = list.map((g: { id: string }) => g.id);

    const { data: responseCounts } = gigIds.length
      ? await service.from('gig_responses').select('gig_id').in('gig_id', gigIds)
      : { data: [] };
    const countByGig = new Map<string, number>();
    for (const r of responseCounts ?? []) {
      const id = (r as { gig_id: string }).gig_id;
      countByGig.set(id, (countByGig.get(id) ?? 0) + 1);
    }

    const data = list.map((g: Record<string, unknown>) => ({
      id: g.id,
      gig_type: 'urgent',
      skill_required: g.skill_required ?? null,
      genre: g.genre ?? [],
      date_needed: g.date_needed ?? null,
      duration_hours: g.duration_hours ?? null,
      payment_amount: g.payment_amount ?? null,
      payment_currency: g.payment_currency ?? 'GBP',
      location_address: g.location_address ?? null,
      status: g.urgent_status ?? 'searching',
      payment_status: g.payment_status ?? 'pending',
      expires_at: g.expires_at ?? null,
      response_count: countByGig.get(g.id as string) ?? 0,
      created_at: g.created_at ?? null,
    }));

    return NextResponse.json({ success: true, data }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/gigs/my:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
