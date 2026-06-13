import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { leaveCommunity } from '@/src/lib/community-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const creatorId = body.creator_id ?? body.creatorId;

    if (!creatorId || !UUID_RE.test(String(creatorId))) {
      return NextResponse.json({ error: 'Invalid creator_id' }, { status: 400, headers: corsHeaders });
    }

    const result = await leaveCommunity(supabase, user.id, String(creatorId));
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Failed to leave' }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, is_member: false }, { headers: corsHeaders });
  } catch (e) {
    console.error('[community/leave]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
