/**
 * Vercel Cron: Early adopter free Premium grant expiry
 * - Pre-expiry pushes (7d, 1d)
 * - Downgrade subscription_tier to free on expiry day
 * - Post-expiry re-engagement pushes (day 7, day 14)
 *
 * GET /api/cron/early-adopter-premium-expiry
 * Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { runEarlyAdopterPremiumExpiryJob } from '@/src/lib/early-adopter-conversion';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[cron early-adopter-premium-expiry] CRON_SECRET not set');
      return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron early-adopter-premium-expiry] started');
    const supabase = createServiceClient();
    const result = await runEarlyAdopterPremiumExpiryJob(supabase);

    console.log('[cron early-adopter-premium-expiry] done', result);

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
    });
  } catch (error) {
    console.error('[cron early-adopter-premium-expiry] failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
