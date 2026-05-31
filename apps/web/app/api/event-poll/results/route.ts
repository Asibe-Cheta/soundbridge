import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseRouteClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const campaignId = new URL(request.url).searchParams.get('campaign_id');
  if (!campaignId) {
    return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('get_poll_results', {
    p_campaign_id: campaignId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ results: data });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseRouteClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    campaignId?: string;
    selectedOption?: string;
    selectedDate?: string;
    selectedLocation?: string;
  } | null;

  if (!body?.campaignId || !body?.selectedOption) {
    return NextResponse.json({ error: 'campaignId and selectedOption are required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('respond_to_poll', {
    p_campaign_id: body.campaignId,
    p_user_id: user.id,
    p_selected_option: body.selectedOption,
    p_selected_date: body.selectedDate ?? null,
    p_selected_location: body.selectedLocation ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, recorded: Boolean(data) });
}
