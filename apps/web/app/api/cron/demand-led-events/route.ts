import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import {
  expirePollCampaigns,
  runLiveInterestThresholdCheck,
} from '@/src/lib/demand-led-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorizeCron(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const expired = await expirePollCampaigns(supabase);
    const threshold = await runLiveInterestThresholdCheck(supabase);

    return NextResponse.json({
      success: true,
      expired_campaigns: expired,
      threshold,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/demand-led-events]', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Cron failed' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
