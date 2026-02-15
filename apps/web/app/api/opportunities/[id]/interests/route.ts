import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunities/:id/interests — List interests (opportunity owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id: opportunityId } = await params;
    const { data: opp } = await supabase
      .from('opportunity_posts')
      .select('user_id')
      .eq('id', opportunityId)
      .single();

    if (!opp || opp.user_id !== user.id) {
      return NextResponse.json({ error: 'Not allowed to view interests for this opportunity' }, { status: 403, headers: CORS });
    }

    const { data: items, error } = await supabase
      .from('opportunity_interests')
      .select(`
        id,
        reason,
        message,
        status,
        created_at,
        user:profiles!interested_user_id(id, display_name, username, avatar_url, professional_headline)
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('opportunity_interests select error:', error);
      return NextResponse.json({ error: 'Failed to load interests' }, { status: 500, headers: CORS });
    }

    const formatted = (items ?? []).map((i: { user?: unknown }) => ({
      ...i,
      user: (i as { user?: { id: string; display_name: string; username: string; avatar_url: string; professional_headline: string } }).user ?? null,
    }));

    return NextResponse.json({ items: formatted }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/opportunities/[id]/interests:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
