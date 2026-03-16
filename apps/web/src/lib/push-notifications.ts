/**
 * Push notifications via Expo Push API — WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD
 * Single helper: get token from profiles.expo_push_token (then user_push_tokens), send one message.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';

let _expo: Expo | null = null;
function getExpo(): Expo {
  if (!_expo) _expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN, useFcmV1: true });
  return _expo;
}

/**
 * Get recipient's Expo push token. Prefer profiles.expo_push_token, then user_push_tokens (active).
 * Only returns if token is valid (Expo.isExpoPushToken).
 */
export async function getPushToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle();
  const profileToken = (profile as { expo_push_token?: string } | null)?.expo_push_token ?? null;
  if (profileToken && getExpo().isExpoPushToken(profileToken)) return profileToken;

  const { data: tokenRow } = await supabase
    .from('user_push_tokens')
    .select('push_token')
    .eq('user_id', userId)
    .eq('active', true)
    .order('last_used_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const token = (tokenRow as { push_token?: string } | null)?.push_token ?? null;
  if (token && getExpo().isExpoPushToken(token)) return token;
  return null;
}

export interface SendExpoPushOptions {
  title: string;
  body: string;
  data: Record<string, unknown> & { type: string };
  channelId: string;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
}

/**
 * Send one push notification to recipient. Uses getPushToken (profiles then user_push_tokens).
 * Only sends if token is present and valid. Does not throw; logs errors.
 */
export async function sendExpoPush(
  supabase: SupabaseClient,
  recipientUserId: string,
  options: SendExpoPushOptions
): Promise<boolean> {
  const token = await getPushToken(supabase, recipientUserId);
  if (!token) return false;
  try {
    await getExpo().sendPushNotificationsAsync([
      {
        to: token,
        title: options.title,
        body: options.body,
        data: options.data,
        channelId: options.channelId,
        priority: options.priority ?? 'high',
        sound: options.sound ?? 'default',
      },
    ]);
    return true;
  } catch (e) {
    console.error('sendExpoPush:', e);
    return false;
  }
}
