import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { getCommunityMemberCount, userIsCommunityMember } from '@/src/lib/community-service';

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

/** Membership status + member count for a creator. */
export async function GET(request: NextRequest) {
  try {
    const creatorId = request.nextUrl.searchParams.get('creator_id');
    if (!creatorId || !UUID_RE.test(creatorId)) {
      return NextResponse.json({ error: 'Invalid creator_id' }, { status: 400, headers: corsHeaders });
    }

    const service = createServiceClient();
    const member_count = await getCommunityMemberCount(service, creatorId);

    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, false);
    if (authError || !user) {
      return NextResponse.json(
        { success: true, is_member: false, member_count, authenticated: false },
        { headers: corsHeaders },
      );
    }

    const is_member = await userIsCommunityMember(supabase, user.id, creatorId);

    return NextResponse.json(
      { success: true, is_member, member_count, authenticated: true },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[community/membership]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
