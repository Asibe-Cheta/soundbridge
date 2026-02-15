import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/opportunity-projects — List projects for current user (poster or creator)
 * Query: role=poster|creator, status=active|...
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let q = supabase
      .from('opportunity_projects')
      .select(`
        id,
        opportunity_id,
        title,
        brief,
        agreed_amount,
        currency,
        platform_fee_amount,
        creator_payout_amount,
        deadline,
        status,
        chat_thread_id,
        created_at,
        poster_user_id,
        creator_user_id
      `)
      .or(`poster_user_id.eq.${user.id},creator_user_id.eq.${user.id}`);

    if (role === 'poster') q = q.eq('poster_user_id', user.id);
    else if (role === 'creator') q = q.eq('creator_user_id', user.id);
    if (status) q = q.eq('status', status);

    q = q.order('created_at', { ascending: false });

    const { data: items, error } = await q;

    if (error) {
      console.error('opportunity_projects list error:', error);
      return NextResponse.json({ error: 'Failed to load projects' }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ items: items ?? [] }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/opportunity-projects:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
