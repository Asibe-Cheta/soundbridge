/**
 * Cron: rating prompts — gigs completed 20–30h ago (run every 30 min)
 * WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md Part 3 Job 3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { sendGigRatingPromptPush } from '@/src/lib/gig-push-notifications';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const service = createServiceClient();

    const { data: projects } = await service
      .from('opportunity_projects')
      .select('id, opportunity_id, poster_user_id, creator_user_id')
      .eq('status', 'completed')
      .gte('completed_at', twentyHoursAgo.toISOString())
      .lte('completed_at', thirtyHoursAgo.toISOString());

    if (!projects?.length) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    const oppIds = [...new Set(projects.map((p) => p.opportunity_id))];
    const { data: urgentGigs } = await service
      .from('opportunity_posts')
      .select('id')
      .eq('gig_type', 'urgent')
      .in('id', oppIds);
    const urgentSet = new Set((urgentGigs ?? []).map((g: { id: string }) => g.id));

    const { data: alreadySent } = await service
      .from('notification_rate_limits')
      .select('gig_id')
      .eq('notification_type', 'gig_rating_prompt')
      .in('gig_id', oppIds);
    const sentSet = new Set((alreadySent ?? []).map((r: { gig_id: string }) => r.gig_id));

    let notified = 0;
    for (const project of projects) {
      if (!urgentSet.has(project.opportunity_id) || sentSet.has(project.opportunity_id)) continue;
      const { data: creator } = await service.from('profiles').select('display_name').eq('id', project.creator_user_id).single();
      const name = (creator as { display_name?: string } | null)?.display_name ?? 'Your provider';
      await sendGigRatingPromptPush(service, project.poster_user_id, name);
      await service.from('notification_rate_limits').insert({
        user_id: project.poster_user_id,
        notification_type: 'gig_rating_prompt',
        sent_at: new Date().toISOString(),
        gig_id: project.opportunity_id,
      });
      sentSet.add(project.opportunity_id);
      notified++;
    }

    return NextResponse.json({ success: true, notified });
  } catch (e) {
    console.error('cron urgent-gigs/rating-prompt:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
