import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job for subscription management tasks
 * Should be called daily (e.g., via Vercel Cron, GitHub Actions, or external cron service)
 *
 * Tasks:
 * 1. Reset monthly upload counters for Premium users (on renewal date)
 * 2. Check for expired subscriptions and revert to free
 * 3. Reset monthly featured counter (1st of each month)
 * 4. Featured artist rotation (select new users to feature)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results = {
      uploadCountersReset: 0,
      subscriptionsExpired: 0,
      featuredCountersReset: 0,
      newFeaturedUsers: 0,
    };

    // Task 1: Reset monthly upload counters for Premium users
    results.uploadCountersReset = await resetMonthlyUploadCounters(supabase);

    // Task 2: Check for expired subscriptions
    results.subscriptionsExpired = await expireSubscriptions(supabase);

    // Task 3: Reset monthly featured counter (if it's the 1st of the month)
    const today = new Date();
    if (today.getDate() === 1) {
      results.featuredCountersReset = await resetFeaturedCounters(supabase);
    }

    // Task 4: Featured artist rotation
    results.newFeaturedUsers = await rotateFeaturedArtists(supabase);

    console.log('✅ CRON: Subscription management completed:', results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error: any) {
    console.error('❌ CRON: Error in subscription management:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Reset monthly upload counters for Premium users whose renewal date has passed
 */
async function resetMonthlyUploadCounters(supabase: any): Promise<number> {
  console.log('🔄 CRON: Resetting monthly upload counters...');

  const { data: usersToReset, error: fetchError } = await supabase
    .from('profiles')
    .select('id, subscription_renewal_date')
    .eq('subscription_tier', 'premium')
    .eq('subscription_status', 'active')
    .lte('subscription_renewal_date', new Date().toISOString());

  if (fetchError) {
    console.error('❌ Error fetching users to reset:', fetchError);
    return 0;
  }

  if (!usersToReset || usersToReset.length === 0) {
    console.log('ℹ️ No users need upload counter reset');
    return 0;
  }

  for (const user of usersToReset) {
    // Reset uploads and update renewal date
    const nextRenewalDate = new Date(user.subscription_renewal_date);
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        uploads_this_period: 0,
        upload_period_start: new Date().toISOString(),
        subscription_renewal_date: nextRenewalDate.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error resetting counter for user ${user.id}:`, updateError);
    } else {
      console.log(`✅ Reset upload counter for user ${user.id}`);
    }
  }

  return usersToReset.length;
}

/**
 * Expire subscriptions that have passed their renewal date without renewal
 */
async function expireSubscriptions(supabase: any): Promise<number> {
  console.log('⏰ CRON: Checking for expired subscriptions...');

  const { data: usersToExpire, error: fetchError } = await supabase
    .from('profiles')
    .select('id, subscription_tier, custom_username')
    .in('subscription_status', ['active', 'cancelled', 'past_due'])
    .lte('subscription_renewal_date', new Date().toISOString());

  if (fetchError) {
    console.error('❌ Error fetching users to expire:', fetchError);
    return 0;
  }

  if (!usersToExpire || usersToExpire.length === 0) {
    console.log('ℹ️ No subscriptions to expire');
    return 0;
  }

  for (const user of usersToExpire) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'expired',
        subscription_period: null,
        custom_username: null, // Remove custom URL
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error expiring subscription for user ${user.id}:`, updateError);
    } else {
      console.log(`✅ Expired subscription for user ${user.id}, reverted to free`);
      // TODO: Send expiration notification email
    }
  }

  return usersToExpire.length;
}

/**
 * Reset monthly featured counter (on 1st of each month)
 */
async function resetFeaturedCounters(supabase: any): Promise<number> {
  console.log('🔄 CRON: Resetting monthly featured counters...');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      featured_count_this_month: 0,
    })
    .in('subscription_tier', ['premium', 'unlimited'])
    .select('id');

  if (error) {
    console.error('❌ Error resetting featured counters:', error);
    return 0;
  }

  console.log(`✅ Reset featured counters for ${data.length} users`);
  return data.length;
}

/**
 * Rotate featured artists (daily)
 * Premium: Featured 1x/month (48 hours)
 * Unlimited: Featured 2x/month (48 hours)
 */
async function rotateFeaturedArtists(supabase: any): Promise<number> {
  console.log('⭐ CRON: Rotating featured artists...');

  const FEATURED_DURATION_HOURS = 48;

  // Remove users who have been featured for > 48 hours
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - FEATURED_DURATION_HOURS);

  await supabase
    .from('profiles')
    .update({
      next_featured_date: null, // Clear "currently featured" status
    })
    .lte('last_featured_date', cutoffDate.toISOString())
    .not('last_featured_date', 'is', null);

  // Select Premium users eligible for featuring (not featured this month, < 1x)
  const { data: premiumEligible, error: premiumError } = await supabase
    .from('profiles')
    .select('id')
    .eq('subscription_tier', 'premium')
    .eq('subscription_status', 'active')
    .lt('featured_count_this_month', 1)
    .order('last_featured_date', { ascending: true, nullsFirst: true })
    .limit(5); // Select 5 random Premium users

  // Select Unlimited users eligible for featuring (< 2x this month)
  const { data: unlimitedEligible, error: unlimitedError } = await supabase
    .from('profiles')
    .select('id')
    .eq('subscription_tier', 'unlimited')
    .eq('subscription_status', 'active')
    .lt('featured_count_this_month', 2)
    .order('last_featured_date', { ascending: true, nullsFirst: true })
    .limit(5); // Select 5 random Unlimited users

  if (premiumError || unlimitedError) {
    console.error('❌ Error fetching eligible users:', premiumError || unlimitedError);
    return 0;
  }

  const eligibleUsers = [
    ...(premiumEligible || []),
    ...(unlimitedEligible || []),
  ];

  if (eligibleUsers.length === 0) {
    console.log('ℹ️ No eligible users for featuring');
    return 0;
  }

  // Randomly select 3-5 users to feature
  const usersToFeature = shuffleArray(eligibleUsers).slice(0, Math.min(5, eligibleUsers.length));

  for (const user of usersToFeature) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        featured_count_this_month: supabase.rpc('increment', { x: 1, field: 'featured_count_this_month' }),
        last_featured_date: new Date().toISOString(),
        next_featured_date: new Date(Date.now() + FEATURED_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error featuring user ${user.id}:`, updateError);
    } else {
      console.log(`✅ Featured user ${user.id} for 48 hours`);
      // TODO: Send featured notification email
    }
  }

  return usersToFeature.length;
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
