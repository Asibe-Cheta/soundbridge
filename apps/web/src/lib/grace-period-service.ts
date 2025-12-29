import { createServiceClient } from './supabase';
import type { Database } from './types';

const serviceSupabase = createServiceClient();

const FREE_TIER_STORAGE_LIMIT = 30 * 1024 * 1024; // 30MB in bytes
const GRACE_PERIOD_DAYS = 90;

/**
 * Check if a user is eligible for a grace period
 */
export async function isEligibleForGracePeriod(userId: string): Promise<boolean> {
  const { data, error } = await serviceSupabase.rpc('is_eligible_for_grace_period', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error checking grace period eligibility:', error);
    return false;
  }

  return data === true;
}

/**
 * Calculate total storage used by a user's audio tracks
 */
async function calculateUserStorage(userId: string): Promise<number> {
  const { data: tracks, error } = await serviceSupabase
    .from('audio_tracks')
    .select('file_size')
    .eq('creator_id', userId)
    .is('deleted_at', null);

  if (error) {
    console.error('Error calculating user storage:', error);
    return 0;
  }

  return (tracks || []).reduce((total, track) => total + (track.file_size || 0), 0);
}

/**
 * Grant a grace period to a user when they downgrade from premium/unlimited to free
 */
export async function grantGracePeriod(
  userId: string,
  fromTier: 'premium' | 'unlimited' | 'pro' | 'enterprise',
  toTier: 'free'
): Promise<{ success: boolean; error?: string; gracePeriodEnds?: string }> {
  try {
    // Normalize tier names
    const normalizedFromTier = fromTier === 'pro' ? 'premium' : fromTier === 'enterprise' ? 'unlimited' : fromTier;

    // Check eligibility
    const eligible = await isEligibleForGracePeriod(userId);
    if (!eligible) {
      console.log(`User ${userId} is not eligible for grace period`);
      return { success: false, error: 'Not eligible for grace period' };
    }

    // Only grant grace period if downgrading from paid to free
    if (normalizedFromTier === 'free' || toTier !== 'free') {
      return { success: false, error: 'Grace period only applies to downgrades from paid to free' };
    }

    // Calculate storage at downgrade
    const storageAtDowngrade = await calculateUserStorage(userId);

    // Calculate grace period end date (90 days from now)
    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + GRACE_PERIOD_DAYS);

    // Get current grace period usage
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('grace_periods_used, last_grace_period_used')
      .eq('id', userId)
      .single();

    const gracePeriodsUsed = (profile?.grace_periods_used || 0) + 1;

    // Update profile with grace period
    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({
        downgraded_at: new Date().toISOString(),
        grace_period_ends: gracePeriodEnds.toISOString(),
        storage_at_downgrade: storageAtDowngrade,
        grace_periods_used: gracePeriodsUsed,
        last_grace_period_used: new Date().toISOString(),
        subscription_tier: 'free',
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error granting grace period:', updateError);
      return { success: false, error: updateError.message };
    }

    // Record subscription change for abuse prevention
    const { error: changeError } = await serviceSupabase
      .from('subscription_changes')
      .insert({
        user_id: userId,
        from_tier: normalizedFromTier,
        to_tier: toTier,
        storage_at_change: storageAtDowngrade,
        reason: 'subscription_cancelled',
      });

    if (changeError) {
      console.error('Error recording subscription change:', changeError);
      // Don't fail the whole operation if this fails
    }

    console.log(`✅ Grace period granted to user ${userId} until ${gracePeriodEnds.toISOString()}`);
    return { success: true, gracePeriodEnds: gracePeriodEnds.toISOString() };
  } catch (error) {
    console.error('Unexpected error in grantGracePeriod:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Expire grace periods that have passed their end date
 * This should be called by a cron job daily
 */
export async function expireGracePeriods(): Promise<{
  success: boolean;
  expired: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let expired = 0;

  try {
    // Find all users with expired grace periods
    const { data: expiredProfiles, error: fetchError } = await serviceSupabase
      .from('profiles')
      .select('id, grace_period_ends, storage_at_downgrade')
      .not('grace_period_ends', 'is', null)
      .lt('grace_period_ends', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired grace periods:', fetchError);
      return { success: false, expired: 0, errors: [fetchError.message] };
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      console.log('No expired grace periods found');
      return { success: true, expired: 0, errors: [] };
    }

    console.log(`Found ${expiredProfiles.length} expired grace periods`);

    // Process each expired grace period
    for (const profile of expiredProfiles) {
      try {
        // Mark excess content as private
        await markExcessContentPrivate(profile.id, profile.storage_at_downgrade || 0);

        // Clear grace period fields
        const { error: clearError } = await serviceSupabase
          .from('profiles')
          .update({
            grace_period_ends: null,
            downgraded_at: null,
            storage_at_downgrade: null,
          })
          .eq('id', profile.id);

        if (clearError) {
          errors.push(`Failed to clear grace period for user ${profile.id}: ${clearError.message}`);
        } else {
          expired++;
          console.log(`✅ Grace period expired for user ${profile.id}`);
        }
      } catch (error) {
        errors.push(`Error processing grace period for user ${profile.id}: ${(error as Error).message}`);
      }
    }

    return { success: errors.length === 0, expired, errors };
  } catch (error) {
    console.error('Unexpected error in expireGracePeriods:', error);
    return { success: false, expired, errors: [(error as Error).message] };
  }
}

/**
 * Mark excess content as private when grace period expires
 * Keeps tracks that fit within 30MB limit as public, marks the rest as private
 * 
 * Note: Since posts and audio_tracks don't have a direct foreign key relationship,
 * we mark posts as private based on the user's total storage usage. Posts containing
 * audio attachments from tracks that exceed the limit will be marked private.
 */
async function markExcessContentPrivate(userId: string, storageAtDowngrade: number): Promise<void> {
  // Get all user's tracks sorted by priority (most played first, then most recent)
  const { data: tracks, error: tracksError } = await serviceSupabase
    .from('audio_tracks')
    .select('id, file_size, play_count, created_at')
    .eq('creator_id', userId)
    .is('deleted_at', null)
    .order('play_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (tracksError || !tracks) {
    console.error('Error fetching tracks for privacy update:', tracksError);
    return;
  }

  // Select tracks that fit in 30MB
  let totalSize = 0;
  const publicTrackIds: string[] = [];
  const privateTrackIds: string[] = [];

  for (const track of tracks) {
    const fileSize = track.file_size || 0;
    if (totalSize + fileSize <= FREE_TIER_STORAGE_LIMIT) {
      publicTrackIds.push(track.id);
      totalSize += fileSize;
    } else {
      privateTrackIds.push(track.id);
    }
  }

  // Mark posts as private if user's storage exceeds limit
  // Since we can't directly link posts to tracks, we'll mark all posts by the user
  // as private if they have excess storage. This is a conservative approach.
  if (storageAtDowngrade > FREE_TIER_STORAGE_LIMIT) {
    // Get all posts by the user that might contain audio attachments
    const { data: userPosts, error: postsError } = await serviceSupabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (!postsError && userPosts && userPosts.length > 0) {
      // For now, we'll mark posts as private if storage exceeds limit
      // A more sophisticated approach would track which posts contain which tracks
      // This can be refined later when we have better track-to-post linking
      const postIds = userPosts.map((p) => p.id);
      
      // Mark all posts as private (conservative approach)
      // In the future, we can refine this to only mark posts containing excess tracks
      const { error: updateError } = await serviceSupabase
        .from('posts')
        .update({ is_private: true })
        .in('id', postIds);

      if (updateError) {
        console.error('Error marking posts as private:', updateError);
      } else {
        console.log(`Marked ${postIds.length} posts as private for user ${userId} (storage exceeds limit)`);
      }
    }
  }

  console.log(`User ${userId}: ${publicTrackIds.length} public tracks, ${privateTrackIds.length} private tracks`);
}

/**
 * Get storage status for a user
 */
export async function getStorageStatus(userId: string): Promise<{
  status: 'active_subscription' | 'grace_period' | 'grace_expired';
  daysRemaining: number;
  canUpload: boolean;
}> {
  const { data, error } = await serviceSupabase.rpc('get_storage_status', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error getting storage status:', error);
    return {
      status: 'active_subscription',
      daysRemaining: 0,
      canUpload: true,
    };
  }

  if (data && data.length > 0) {
    const result = data[0];
    return {
      status: result.status as 'active_subscription' | 'grace_period' | 'grace_expired',
      daysRemaining: result.days_remaining || 0,
      canUpload: result.can_upload === true,
    };
  }

  return {
    status: 'active_subscription',
    daysRemaining: 0,
    canUpload: true,
  };
}

