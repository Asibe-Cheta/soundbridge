import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  checkLiveStreamEligibility,
  LIVE_STREAM_INELIGIBLE_MESSAGE,
} from '@/src/lib/live-stream-eligibility';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** Called by the mobile app before showing the Go Live button. */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { createServiceClient } = await import('@/src/lib/supabase');
    const supabase = createServiceClient();
    const eligibility = await checkLiveStreamEligibility(supabase, user.id);

    return NextResponse.json(
      {
        ...eligibility,
        message: eligibility.eligible ? null : LIVE_STREAM_INELIGIBLE_MESSAGE,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[live-streams/eligibility] failed:', error);
    return NextResponse.json(
      { error: 'We are currently running some improvements to our live feature. Please bear with us and try again shortly.' },
      { status: 500, headers: corsHeaders },
    );
  }
}
