/**
 * API Endpoint: Notification Scheduler Cron
 * GET /api/cron/notifications?job=morning|afternoon|evening|queue
 * 
 * Endpoint for running scheduled notification jobs
 * Should be called by Vercel Cron or external scheduler
 * 
 * Security: Vercel Cron secret or API key required
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduler } from '@/src/services/notification-scheduler';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get job type from query params
    const { searchParams } = new URL(request.url);
    const job = searchParams.get('job') as 'morning' | 'afternoon' | 'evening' | 'queue' | null;
    
    if (!job || !['morning', 'afternoon', 'evening', 'queue'].includes(job)) {
      return NextResponse.json(
        { error: 'Invalid job type. Must be: morning, afternoon, evening, or queue' },
        { status: 400 }
      );
    }
    
    console.log(`⏰ Cron job triggered: ${job}`);
    
    // Run scheduler
    await runScheduler(job);
    
    return NextResponse.json({
      success: true,
      job,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow POST as well (for some cron services)
export async function POST(request: NextRequest) {
  return GET(request);
}

