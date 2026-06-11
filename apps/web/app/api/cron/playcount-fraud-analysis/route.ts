/**
 * Daily play-count fraud analysis.
 * Schedule: 4AM UK (03:00 UTC — see vercel.json).
 *
 * GET /api/cron/playcount-fraud-analysis
 * Authorization: Bearer {CRON_SECRET}
 * Query: ?creatorId=uuid (optional single-creator run)
 *        ?manualTop=10 (high play_count manual snapshot)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import {
  FRAUD_JOB_VERSION,
  runManualHighPlayAnalysis,
  runPlaycountFraudAnalysisJob,
} from '@/src/lib/playcount-fraud-analysis-job';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const creatorId = request.nextUrl.searchParams.get('creatorId') ?? undefined;
    const manualTop = request.nextUrl.searchParams.get('manualTop');

    if (manualTop) {
      const limit = Math.min(50, parseInt(manualTop, 10) || 10);
      const manual = await runManualHighPlayAnalysis(supabase, limit);
      return NextResponse.json({ success: true, jobVersion: FRAUD_JOB_VERSION, manual });
    }

    const { data: runLog } = await supabase
      .from('cron_job_runs')
      .insert({ job_name: 'playcount_fraud_analysis', status: 'running' })
      .select('id')
      .single();

    const result = await runPlaycountFraudAnalysisJob(supabase, { creatorId });

    if (runLog?.id) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: result.errors.length ? 'failed' : 'success',
          processed_count: result.rowsUpserted,
          error_message: result.errors.length ? result.errors.slice(0, 5).join('; ') : null,
          finished_at: new Date().toISOString(),
        })
        .eq('id', runLog.id);
    }

    return NextResponse.json({ success: result.errors.length === 0, ...result });
  } catch (error) {
    console.error('[cron playcount-fraud-analysis]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
