import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/has-tipped?trackId=<uuid>
 * Returns whether the logged-in user has completed a tip for this track.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const trackId = new URL(request.url).searchParams.get('trackId')?.trim();
    if (!trackId) {
      return NextResponse.json({ error: 'trackId query parameter is required' }, { status: 400, headers: corsHeaders });
    }

    const { data: row, error: queryError } = await supabase
      .from('tips')
      .select('id')
      .eq('sender_id', user.id)
      .eq('track_id', trackId)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error('[has-tipped]', queryError);
      return NextResponse.json({ error: 'Failed to check tip status' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        hasTipped: Boolean(row?.id),
        trackId,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[has-tipped]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
