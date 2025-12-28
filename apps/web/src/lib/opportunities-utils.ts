/**
 * Utility functions for Opportunities and Express Interest features
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a user is a service provider
 */
export async function isServiceProvider(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('service_provider_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return !!data && !error;
}

/**
 * Check if a user is a subscriber (premium or unlimited tier)
 */
export async function isSubscriber(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return false;
  }

  return profile.subscription_tier !== 'free' && profile.subscription_tier !== null;
}

