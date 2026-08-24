/**
 * One-off marketing campaign push (WEB_TEAM_VIDEO_AND_EARNING_CAMPAIGNS.MD) —
 * manually triggered, not on a schedule. Guarded against a repeat broadcast via
 * campaign_notification_sends (any prior row for this campaign_id blocks a resend).
 *
 * GET /api/campaigns/send-one-off?campaignId=video-content-teaser
 * GET /api/campaigns/send-one-off?campaignId=video-content-teaser&test=ExponentPushToken[xxx]
 * Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { isCronOrServiceRoleAuthorized } from '@/src/lib/cron-auth';
import {
  ONE_OFF_CAMPAIGNS,
  hasOneOffCampaignAlreadySent,
  sendOneOffCampaign,
  sendOneOffCampaignTestPush,
} from '@/src/lib/campaign-notifications';

export async function GET(request: NextRequest) {
  if (!isCronOrServiceRoleAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaignId = request.nextUrl.searchParams.get('campaignId');
  if (!campaignId || !ONE_OFF_CAMPAIGNS[campaignId]) {
    return NextResponse.json(
      { success: false, error: `Unknown campaignId. Known: ${Object.keys(ONE_OFF_CAMPAIGNS).join(', ')}` },
      { status: 400 },
    );
  }

  const testToken = request.nextUrl.searchParams.get('test');
  if (testToken) {
    try {
      await sendOneOffCampaignTestPush(campaignId, testToken);
      return NextResponse.json({ success: true, campaignId, test: true });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 },
      );
    }
  }

  const supabase = createServiceClient();

  if (await hasOneOffCampaignAlreadySent(supabase, campaignId)) {
    return NextResponse.json({ success: true, campaignId, reason: 'Already sent' });
  }

  const { error: guardError } = await supabase.from('campaign_notification_sends').insert({
    campaign_id: campaignId,
    send_date: new Date().toISOString().slice(0, 10),
  });
  if (guardError) {
    if ((guardError as { code?: string }).code === '23505') {
      return NextResponse.json({ success: true, campaignId, reason: 'Already sent' });
    }
    console.error('[send-one-off] guard insert failed:', guardError.message);
    return NextResponse.json({ success: false, error: guardError.message }, { status: 500 });
  }

  try {
    const result = await sendOneOffCampaign(supabase, campaignId);
    console.log(
      `[send-one-off] ${campaignId}: sent ${result.sent}, opted out ${result.optedOut}`,
    );
    return NextResponse.json({ success: true, campaignId, ...result });
  } catch (error) {
    console.error('[send-one-off] send failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
