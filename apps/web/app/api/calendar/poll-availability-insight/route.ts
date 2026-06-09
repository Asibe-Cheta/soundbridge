import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Poll dashboard calendar insight — returns 404 until pattern aggregation job ships.
 * When live: creator-wide aggregate from calendar-connected fans who expressed interest.
 */
export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');
  if (!campaignId) {
    return NextResponse.json(
      { success: false, error: 'campaignId is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const service = createServiceClient();
    const { data: campaign } = await service
      .from('poll_campaigns')
      .select('id, creator_id')
      .eq('id', campaignId)
      .maybeSingle();

    if (!campaign || campaign.creator_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Calendar insights not available yet' },
      { status: 404, headers: corsHeaders },
    );
  } catch (error) {
    console.error('[calendar/poll-availability-insight]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
