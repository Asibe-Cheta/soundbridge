// Vercel Cron Job: Expire Grace Periods
// Runs daily to expire grace periods and mark excess content as private
// Endpoint: /api/cron/expire-grace-periods

import { NextRequest, NextResponse } from 'next/server';
import { expireGracePeriods } from '@/src/lib/grace-period-service';

/**
 * Vercel Cron Job Handler
 * Configured in vercel.json to run daily
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Grace period expiration cron job started');

    const result = await expireGracePeriods();

    if (result.success) {
      console.log(`✅ Grace period expiration completed: ${result.expired} grace periods expired`);
      return NextResponse.json({
        success: true,
        expired: result.expired,
        errors: result.errors,
      });
    } else {
      console.error('❌ Grace period expiration failed:', result.errors);
      return NextResponse.json(
        {
          success: false,
          expired: result.expired,
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Unexpected error in grace period expiration cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

