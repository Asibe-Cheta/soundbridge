import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { buildEventPollCombinations } from '@/src/lib/event-poll';
import { resolveEffectiveTier, type ProfileTierInput } from '@/src/lib/effective-subscription-tier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseRouteClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, early_adopter, subscription_period_end, display_name, username')
    .eq('id', user.id)
    .maybeSingle();

  const tier = resolveEffectiveTier(profile as ProfileTierInput, 'free');
  if (tier !== 'premium' && tier !== 'unlimited') {
    return NextResponse.json({ error: 'Premium or Unlimited required' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    messageBody?: string;
    dateOptions?: string[];
    locationOptions?: string[];
    trackName?: string;
  } | null;

  const dateOptions = (body?.dateOptions ?? []).map((d) => String(d).trim()).filter(Boolean).slice(0, 4);
  const locationOptions = (body?.locationOptions ?? []).map((l) => String(l).trim()).filter(Boolean).slice(0, 3);

  if (!dateOptions.length || !locationOptions.length) {
    return NextResponse.json({ error: 'At least one date and one location are required' }, { status: 400 });
  }

  const artistName = profile?.display_name || profile?.username || 'Artist';
  const trackName = body?.trackName?.trim() || 'your music';
  const defaultMessage = `Hey, you mentioned you wanted to hear ${trackName} live. I am thinking of making it happen. Help me pick the best date and place.\n\n${artistName}`;
  const messageBody = body?.messageBody?.trim() || defaultMessage;
  const combinedOptions = buildEventPollCombinations(dateOptions, locationOptions);

  if (!combinedOptions.length) {
    return NextResponse.json({ error: 'Could not build poll options' }, { status: 400 });
  }

  const { data: campaignId, error } = await supabase.rpc('dispatch_poll_campaign', {
    p_creator_id: user.id,
    p_message_body: messageBody,
    p_date_options: dateOptions,
    p_location_options: locationOptions,
    p_combined_options: combinedOptions,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, campaignId });
}
