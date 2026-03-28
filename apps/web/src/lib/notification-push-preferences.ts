/**
 * Server-side checks for notification_preferences before sending Expo pushes.
 * @see WEB_TEAM_PUSH_NOTIFICATIONS_GAPS.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendExpoPush, type SendExpoPushOptions } from '@/src/lib/push-notifications';

export type PushPreferenceKind =
  | 'comments_on_posts'
  | 'likes_on_posts'
  | 'new_followers'
  | 'content_sales'
  | 'tip'
  | 'collaboration'
  /** Unsolicited urgent gig / nearby opportunity offers */
  | 'gig_opportunity'
  /** Gig lifecycle where user is already a party (accepted, confirmed, reminders, rating) */
  | 'gig_transactional'
  /** Wallet credit from gig completion */
  | 'gig_wallet';

function rowAllows(row: Record<string, unknown> | null | undefined, key: string): boolean {
  if (!row) return true;
  if (row.enabled === false) return false;
  const v = row[key];
  if (v === false) return false;
  return true;
}

/**
 * Returns false if user opted out (missing row => allow).
 */
export async function canReceivePushOfKind(
  supabase: SupabaseClient,
  userId: string,
  kind: PushPreferenceKind
): Promise<boolean> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const row = data as Record<string, unknown> | null;
  if (!rowAllows(row, 'enabled')) return false;

  switch (kind) {
    case 'comments_on_posts':
      return rowAllows(row, 'comments_on_posts');
    case 'likes_on_posts':
      return rowAllows(row, 'likes_on_posts');
    case 'new_followers':
      return rowAllows(row, 'new_followers');
    case 'content_sales': {
      if (!row) return true;
      if (row.content_sales === false) return false;
      if (row.wallet_notifications_enabled === false) return false;
      return true;
    }
    case 'tip':
      return rowAllows(row, 'tip_notifications_enabled');
    case 'collaboration':
      return rowAllows(row, 'collaboration_notifications_enabled');
    case 'gig_opportunity':
      return rowAllows(row, 'urgent_gig_notifications_enabled');
    case 'gig_transactional':
      return rowAllows(row, 'enabled');
    case 'gig_wallet': {
      if (!row) return true;
      if (row.wallet_notifications_enabled === false) return false;
      return rowAllows(row, 'enabled');
    }
    default:
      return true;
  }
}

export async function sendExpoPushIfAllowed(
  supabase: SupabaseClient,
  recipientUserId: string,
  kind: PushPreferenceKind,
  options: SendExpoPushOptions
): Promise<boolean> {
  if (!(await canReceivePushOfKind(supabase, recipientUserId, kind))) {
    return false;
  }
  return sendExpoPush(supabase, recipientUserId, options);
}
