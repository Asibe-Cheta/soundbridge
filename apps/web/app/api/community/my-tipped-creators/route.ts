import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { getMyTippedCreators } from '@/src/lib/community-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** Creators the current user has tipped (regular + live session tips). */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const creators = await getMyTippedCreators(supabase, user.id);

    return NextResponse.json(
      {
        success: true,
        creators,
        count: creators.length,
        /** Documented for mobile: tips table uses recipient_id, not creator_id. */
        tips_creator_column: 'recipient_id',
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[community/my-tipped-creators]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
