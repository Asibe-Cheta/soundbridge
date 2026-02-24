/**
 * Cron: clean stale location (run every 30 min)
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §5.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const service = createServiceClient();
    const { data, error } = await service
      .from('user_availability')
      .update({
        current_lat: null,
        current_lng: null,
        updated_at: new Date().toISOString(),
      })
      .lt('last_location_update', cutoff)
      .not('current_lat', 'is', null)
      .select('id');

    if (error) {
      console.error('clean-location:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, cleared: data?.length ?? 0 });
  } catch (e) {
    console.error('cron urgent-gigs/clean-location:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
