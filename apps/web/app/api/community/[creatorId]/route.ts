import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getCommunityDetail } from '@/src/lib/community-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  try {
    const { creatorId } = await params;
    if (!UUID_RE.test(creatorId)) {
      return NextResponse.json({ error: 'Invalid creator id' }, { status: 400, headers: corsHeaders });
    }

    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const result = await getCommunityDetail(supabase, creatorId, user.id);
    if (!result.ok) {
      if (result.reason === 'not_member') {
        return NextResponse.json({ error: 'Not a member of this community' }, { status: 403, headers: corsHeaders });
      }
      return NextResponse.json({ error: 'Community not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, ...result.community }, { headers: corsHeaders });
  } catch (e) {
    console.error('[community/[creatorId]]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
