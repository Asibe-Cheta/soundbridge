import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { countCompletedTipsToCreator, userIsCommunityMember } from '@/src/lib/community-service';

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

/** Whether to show the post-tip community join prompt (first tip, not a member). */
export async function GET(request: NextRequest) {
  try {
    const creatorId = request.nextUrl.searchParams.get('creator_id');
    if (!creatorId || !UUID_RE.test(creatorId)) {
      return NextResponse.json({ error: 'Invalid creator_id' }, { status: 400, headers: corsHeaders });
    }

    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const isMember = await userIsCommunityMember(supabase, user.id, creatorId);
    if (isMember) {
      return NextResponse.json(
        { success: true, eligible: false, reason: 'already_member' },
        { headers: corsHeaders },
      );
    }

    const tipCount = await countCompletedTipsToCreator(supabase, user.id, creatorId);
    const eligible = tipCount === 1;

    return NextResponse.json(
      {
        success: true,
        eligible,
        reason: eligible ? 'first_tip' : tipCount === 0 ? 'no_tip' : 'not_first_tip',
        tip_count: tipCount,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[community/tip-prompt-eligible]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
