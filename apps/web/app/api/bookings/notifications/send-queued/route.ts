import { NextRequest, NextResponse } from 'next/server';

import type { Database } from '@/src/lib/types';
import { bookingNotificationService } from '@/src/services/BookingNotificationService';

const getCronSecret = () => process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isAuthorised(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = getCronSecret();
  return Boolean(authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sent, failed } = await bookingNotificationService.sendQueuedNotifications();
    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Sent ${sent} booking notifications (${failed} failed)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending queued booking notifications', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase service credentials not configured' },
        { status: 500 },
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient<any>(supabaseUrl, serviceKey);

    const nowISO = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('booking_notifications')
      .select('id')
      .eq('status', 'queued')
      .lte('scheduled_for', nowISO);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch queued notifications', details: error.message },
        { status: 500 },
      );
    }

    const queuedCount = data?.length ?? 0;

    return NextResponse.json({
      success: true,
      queued_ready_to_send: queuedCount,
      timestamp: nowISO,
      message: queuedCount > 0 ? `${queuedCount} booking notifications ready to send` : 'No booking notifications queued',
    });
  } catch (error) {
    console.error('Error checking queued booking notifications', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}


