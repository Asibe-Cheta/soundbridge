import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionEmailService } from '../../../../src/services/SubscriptionEmailService';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

/**
 * Cron job endpoint to downgrade accounts after grace period expires
 * Should be called daily via Vercel Cron or similar service
 * 
 * Usage: Set up Vercel Cron job or external cron service to call:
 * GET /api/cron/downgrade-past-due?secret={CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    // Support multiple auth methods:
    // 1. Authorization header: Bearer {CRON_SECRET} (Vercel Cron or manual)
    // 2. Query parameter: ?secret={CRON_SECRET} (external cron services)
    // 3. x-vercel-cron-secret header (alternative header method)
    
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const headerSecret = request.headers.get('x-vercel-cron-secret');
    
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if any provided secret matches
    const isAuthorized = 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (querySecret && querySecret === cronSecret) ||
      (headerSecret && headerSecret === cronSecret);
    
    if (!isAuthorized) {
      console.error('[cron] Unauthorized access attempt - invalid or missing secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('[cron] Checking for past_due subscriptions to downgrade...');

    // Find subscriptions that have been past_due for more than 7 days
    // Note: This assumes we track when status changed to past_due
    // For now, we'll check subscriptions with status 'past_due' that were updated more than 7 days ago
    const { data: pastDueSubscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('user_id, stripe_subscription_id, billing_cycle, updated_at')
      .eq('status', 'past_due')
      .lt('updated_at', sevenDaysAgo.toISOString());

    if (error) {
      console.error('[cron] Error fetching past_due subscriptions:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!pastDueSubscriptions || pastDueSubscriptions.length === 0) {
      console.log('[cron] No subscriptions to downgrade');
      return NextResponse.json({ 
        success: true, 
        message: 'No subscriptions to downgrade',
        downgraded: 0
      });
    }

    console.log(`[cron] Found ${pastDueSubscriptions.length} subscriptions to downgrade`);

    let downgradedCount = 0;
    const errors: string[] = [];

    // Downgrade each subscription
    for (const subscription of pastDueSubscriptions) {
      try {
        // Downgrade to free tier
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'expired',
            subscription_ends_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subscription.user_id);

        if (updateError) {
          console.error(`[cron] Error downgrading subscription for user ${subscription.user_id}:`, updateError);
          errors.push(`User ${subscription.user_id}: ${updateError.message}`);
          continue;
        }

        // Get user info and send downgrade email
        const userInfo = await SubscriptionEmailService.getUserInfo(subscription.user_id);
        if (userInfo && userInfo.email) {
          await SubscriptionEmailService.sendAccountDowngraded({
            userEmail: userInfo.email,
            userName: userInfo.name,
            downgradeReason: 'payment_failed',
            downgradeDate: new Date().toISOString(),
            reactivateUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
          });
        }

        downgradedCount++;
        console.log(`[cron] ✅ Downgraded user ${subscription.user_id} to free tier`);
      } catch (error: any) {
        console.error(`[cron] Error processing downgrade for user ${subscription.user_id}:`, error);
        errors.push(`User ${subscription.user_id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pastDueSubscriptions.length} subscriptions`,
      downgraded: downgradedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[cron] Error in downgrade cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
