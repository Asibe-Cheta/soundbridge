/**
 * Cron: pre-gig reminders — gigs starting in 55–65 min (run every 5 min)
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §5.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { sendGigStartingSoonPush } from '@/src/lib/gig-push-notifications';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const in55 = new Date(now.getTime() + 55 * 60 * 1000);
    const in65 = new Date(now.getTime() + 65 * 60 * 1000);

    const service = createServiceClient();
    const { data: gigs } = await service
      .from('opportunity_posts')
      .select('id, user_id, selected_provider_id, title, date_needed, location_address')
      .eq('gig_type', 'urgent')
      .eq('urgent_status', 'confirmed')
      .not('selected_provider_id', 'is', null)
      .gte('date_needed', in55.toISOString())
      .lte('date_needed', in65.toISOString());

    if (!gigs?.length) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    const { data: alreadySent } = await service
      .from('notification_rate_limits')
      .select('gig_id')
      .eq('notification_type', 'gig_starting_soon')
      .in('gig_id', gigs.map((g) => g.id));
    const sentSet = new Set((alreadySent ?? []).map((r: { gig_id: string }) => r.gig_id));

    let notified = 0;
    const dateNeededStr = (g: { date_needed?: string | null }) => (g.date_needed ? new Date(g.date_needed).toISOString() : '');
    const address = (g: { location_address?: string | null }) => g.location_address ?? null;
    for (const gig of gigs) {
      if (sentSet.has(gig.id)) continue;
      const userIds = [gig.user_id, gig.selected_provider_id].filter(Boolean) as string[];
      const title = gig.title ?? 'Urgent gig';
      for (const uid of userIds) {
        await service.from('notifications').insert({
          user_id: uid,
          type: 'gig_starting_soon',
          title: '⏰ Gig starting in 1 hour',
          body: `"${title}" is coming up soon.`,
          related_id: gig.id,
          related_type: 'opportunity_post',
          metadata: { type: 'gig_starting_soon', gig_id: gig.id },
        });
        await sendGigStartingSoonPush(service, uid, title, dateNeededStr(gig), address(gig));
        await service.from('notification_rate_limits').insert({
          user_id: uid,
          notification_type: 'gig_starting_soon',
          sent_at: new Date().toISOString(),
          gig_id: gig.id,
        });
        notified++;
      }
      sentSet.add(gig.id);
    }

    return NextResponse.json({ success: true, notified });
  } catch (e) {
    console.error('cron urgent-gigs/reminders:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
