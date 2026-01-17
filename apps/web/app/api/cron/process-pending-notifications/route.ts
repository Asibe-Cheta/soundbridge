// Vercel Cron Job: Process Pending Event Notifications
// Runs every 5 minutes to send scheduled event notifications
// Endpoint: /api/cron/process-pending-notifications

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
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

    console.log('🔔 Process pending notifications cron job started');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: runLog } = await supabase
      .from('cron_job_runs')
      .insert({
        job_name: 'process_pending_notifications',
        status: 'running',
      })
      .select('id')
      .single();

    const { data, error } = await supabase.rpc('process_pending_notifications');

    if (error) {
      console.error('❌ process_pending_notifications failed:', error);
      if (runLog?.id) {
        await supabase
          .from('cron_job_runs')
          .update({
            status: 'failed',
            error_message: error.message,
            finished_at: new Date().toISOString(),
          })
          .eq('id', runLog.id);
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (runLog?.id) {
      await supabase
        .from('cron_job_runs')
        .update({
          status: 'success',
          processed_count: data ?? 0,
          finished_at: new Date().toISOString(),
        })
        .eq('id', runLog.id);
    }

    console.log('✅ Process pending notifications completed');

    return NextResponse.json({
      success: true,
      processed: data ?? 0,
    });
  } catch (error) {
    console.error('❌ process pending notifications cron job failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
