/**
 * Vercel Cron: IG Live promo scheduled push campaign (WEB_TEAM_IG_LIVE_CAMPAIGN.MD).
 * Fires once daily; no-ops on any day outside the fixed 14-day schedule. Guarded against
 * double-send (Vercel retry or >1 fire/day) via campaign_notification_sends: the insert's
 * primary key violates on a repeat for the same (campaign, day), so we skip.
 *
 * GET /api/cron/send-campaign-notifications
 * Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { isCronOrServiceRoleAuthorized } from '@/src/lib/cron-auth';
import {
  IG_LIVE_CAMPAIGN_ID,
  todaysCampaignEntry,
  sendCampaignPushToAllUsers,
} from '@/src/lib/campaign-notifications';

export async function GET(request: NextRequest) {
  if (!isCronOrServiceRoleAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entry = todaysCampaignEntry();
  if (!entry) {
    return NextResponse.json({ success: true, reason: 'No campaign entry scheduled for today' });
  }

  const supabase = createServiceClient();

  const { error: guardError } = await supabase.from('campaign_notification_sends').insert({
    campaign_id: IG_LIVE_CAMPAIGN_ID,
    send_date: entry.date,
  });

  if (guardError) {
    if ((guardError as { code?: string }).code === '23505') {
      return NextResponse.json({ success: true, reason: 'Already sent for today' });
    }
    console.error('[cron send-campaign-notifications] guard insert failed:', guardError.message);
    return NextResponse.json({ success: false, error: guardError.message }, { status: 500 });
  }

  try {
    const result = await sendCampaignPushToAllUsers(supabase, entry);
    console.log(
      `[cron send-campaign-notifications] ${entry.date}: sent ${result.sent}, opted out ${result.optedOut}`,
    );
    return NextResponse.json({
      success: true,
      campaignId: IG_LIVE_CAMPAIGN_ID,
      date: entry.date,
      ...result,
    });
  } catch (error) {
    console.error('[cron send-campaign-notifications] send failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
