/**
 * Daily personalised event intelligence scoring job.
 * Schedule: 3AM UK (03:00 UTC — see vercel.json).
 *
 * GET /api/cron/event-match-intelligence
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { runEventMatchIntelligenceJob } from '@/src/lib/event-match-intelligence-job';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[cron event-match-intelligence] CRON_SECRET not set');
      return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron event-match-intelligence] started');
    const supabase = createServiceClient();

    const { data: runLog } = await supabase
      .from('cron_job_runs')
      .insert({ job_name: 'event_match_intelligence', status: 'running' })
      .select('id')
      .single();

    const result = await runEventMatchIntelligenceJob(supabase);

    if (runLog?.id) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: result.errors.length ? 'failed' : 'success',
          processed_count: result.usersProcessed,
          error_message: result.errors.length ? result.errors.slice(0, 5).join('; ') : null,
          finished_at: new Date().toISOString(),
        })
        .eq('id', runLog.id);
    }

    console.log('[cron event-match-intelligence] done', result);

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
    });
  } catch (error) {
    console.error('[cron event-match-intelligence] failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
