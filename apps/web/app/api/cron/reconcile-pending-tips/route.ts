// Vercel Cron Job: Reconcile pending tips
// Finds tips stuck 'pending' despite Stripe already succeeding (webhook missed
// or confirm-tip failed), and Stripe tip charges with no tips/creator_tips row
// at all, and finalizes them via the same logic the webhook uses — minus
// notifications, since these are backfills of payments that may be old.
// Endpoint: /api/cron/reconcile-pending-tips

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import {
  findOrphanedTipPaymentIntents,
  findStuckPendingTips,
  reconcileTipPaymentIntent,
} from '@/src/lib/tip-reconciliation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron job access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();
  const results: Array<{ payment_intent_id: string; outcome: string }> = [];
  let errorMessage: string | null = null;

  try {
    const stuckPendingPIs = await findStuckPendingTips(supabase, 60);
    const orphanedPIs = await findOrphanedTipPaymentIntents(supabase, 25);
    const allPIs = [...new Set([...stuckPendingPIs, ...orphanedPIs])];

    for (const pi of allPIs) {
      try {
        const result = await reconcileTipPaymentIntent(pi, supabase, 'scheduled_job');
        results.push({
          payment_intent_id: pi,
          outcome: result.ok ? (result.skipped ? `skipped:${result.reason}` : `reconciled:${result.reason}`) : `failed:${result.reason}`,
        });
      } catch (e) {
        results.push({ payment_intent_id: pi, outcome: `error:${e instanceof Error ? e.message : 'unknown'}` });
      }
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'unknown error';
  }

  const finishedAt = new Date().toISOString();
  const reconciledCount = results.filter((r) => r.outcome.startsWith('reconciled:')).length;

  await supabase.from('cron_job_runs').insert({
    job_name: 'reconcile_pending_tips',
    status: errorMessage ? 'error' : 'success',
    processed_count: reconciledCount,
    error_message: errorMessage,
    started_at: startedAt,
    finished_at: finishedAt,
  });

  if (errorMessage) {
    return NextResponse.json({ success: false, error: errorMessage, results }, { status: 500 });
  }
  return NextResponse.json({ success: true, checked: results.length, reconciled: reconciledCount, results });
}
