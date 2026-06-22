import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/** GET — current feed catch-up cursor for the authenticated user. */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('last_feed_caught_up_at')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    { success: true, last_feed_caught_up_at: data?.last_feed_caught_up_at ?? null },
    { headers: corsHeaders },
  );
}

/** PATCH — mark feed as caught up (sets cursor to now). */
export async function PATCH(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const now = new Date().toISOString();
  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .update({ last_feed_caught_up_at: now, updated_at: now })
    .eq('id', user.id)
    .select('last_feed_caught_up_at')
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    { success: true, last_feed_caught_up_at: data?.last_feed_caught_up_at ?? now },
    { headers: corsHeaders },
  );
}
