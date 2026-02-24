/**
 * Cron: completion reminders — delivered 20–28h ago, remind requester to confirm (run daily 12:00 UTC)
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twentyEightHoursAgo = new Date(now.getTime() - 28 * 60 * 60 * 1000);
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const service = createServiceClient();
    const { data: projects } = await service
      .from('opportunity_projects')
      .select('id, poster_user_id, title')
      .eq('status', 'delivered')
      .gte('updated_at', twentyEightHoursAgo.toISOString())
      .lte('updated_at', twentyHoursAgo.toISOString());

    if (!projects?.length) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    let notified = 0;
    for (const project of projects) {
      await service.from('notifications').insert({
        user_id: project.poster_user_id,
        type: 'opportunity_project_delivered',
        title: 'Please confirm the gig is complete',
        body: `Has "${project.title}" been delivered? Confirm to release payment to the creator.`,
        related_id: project.id,
        related_type: 'opportunity_project',
        metadata: { project_id: project.id, reminder: 'completion' },
      });
      notified++;
    }

    return NextResponse.json({ success: true, notified });
  } catch (e) {
    console.error('cron urgent-gigs/completion-reminders:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
