/**
 * Daily AI Career Adviser proactive filter.
 * Schedule: 09:00 UTC (see vercel.json).
 *
 * GET /api/cron/ai-career-proactive
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { runAiCareerProactiveFilter } from '@/src/lib/ai-career-proactive-filter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    const service = createServiceClient();
    const result = await runAiCareerProactiveFilter(service);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
      scouting: result.scouting,
    });
  } catch (e) {
    console.error('[cron ai-career-proactive]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
