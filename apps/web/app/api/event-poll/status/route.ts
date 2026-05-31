import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { LIVE_INTEREST_ABSOLUTE_THRESHOLD } from '@/src/lib/event-poll';
import { resolveEffectiveTier, type ProfileTierInput } from '@/src/lib/effective-subscription-tier';

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, early_adopter, subscription_period_end')
    .eq('id', user.id)
    .maybeSingle();

  const tier = resolveEffectiveTier(profile as ProfileTierInput, 'free');
  const tierAccess = tier === 'premium' || tier === 'unlimited';

  const { data: yesCount, error: countError } = await supabase.rpc(
    'creator_live_interest_yes_count',
    { p_creator_id: user.id },
  );

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('poll_campaigns')
    .select('*')
    .eq('creator_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  let results = null;
  if (campaign?.id && tierAccess) {
    const { data: pollResults, error: resultsError } = await supabase.rpc('get_poll_results', {
      p_campaign_id: campaign.id,
    });
    if (!resultsError) results = pollResults;
  }

  const interestedCount = Number(yesCount ?? 0);
  const responseRate =
    campaign && campaign.total_recipients > 0
      ? Math.round((campaign.total_responses / campaign.total_recipients) * 1000) / 10
      : 0;

  return NextResponse.json({
    tierAccess,
    interestedCount,
    minimumToPoll: LIVE_INTEREST_ABSOLUTE_THRESHOLD,
    canSendPoll: tierAccess && interestedCount >= LIVE_INTEREST_ABSOLUTE_THRESHOLD && !campaign,
    activeCampaign: campaign,
    responseRate,
    results,
  });
}
