/**
 * Gig push notifications — payloads per WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md
 * Mobile expects exact format for categoryId, data.deepLink, etc.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';

let _expo: Expo | null = null;
function getExpo() {
  if (!_expo) _expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN, useFcmV1: true });
  return _expo;
}

async function getPushTokenForUser(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from('user_push_tokens')
    .select('push_token')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  const token = (tokenRow as { push_token?: string } | null)?.push_token ?? null;
  if (token && getExpo().isExpoPushToken(token)) return token;
  const { data: profile } = await supabase.from('profiles').select('expo_push_token').eq('id', userId).maybeSingle();
  const profileToken = (profile as { expo_push_token?: string } | null)?.expo_push_token ?? null;
  if (profileToken && getExpo().isExpoPushToken(profileToken)) return profileToken;
  return null;
}

/** Urgent gig: categoryId "urgent_gig" for ACCEPT/DECLINE buttons; priority high */
export async function sendUrgentGigPush(
  supabase: SupabaseClient,
  toUserId: string,
  payload: {
    gigId: string;
    title: string;
    body: string;
    distance_km: number;
    payment: number;
    payment_currency: string;
    skill: string;
    genre: string[] | null;
    date_needed: string;
    location_address: string | null;
  }
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, toUserId);
  if (!token) return false;
  const expo = getExpo();
  const message = {
    to: token,
    title: payload.title,
    body: payload.body,
    categoryId: 'urgent_gig',
    sound: 'default' as const,
    priority: 'high' as const,
    data: {
      type: 'urgent_gig',
      gigId: payload.gigId,
      distance_km: payload.distance_km,
      payment: payload.payment,
      payment_currency: payload.payment_currency || 'GBP',
      skill: payload.skill,
      genre: payload.genre,
      date_needed: payload.date_needed,
      deepLink: `soundbridge://gig/${payload.gigId}`,
    },
  };
  try {
    await expo.sendPushNotificationsAsync([message]);
    return true;
  } catch (e) {
    console.error('sendUrgentGigPush:', e);
    return false;
  }
}

/** gig_accepted — to poster when provider accepts */
export async function sendGigAcceptedPush(
  supabase: SupabaseClient,
  posterUserId: string,
  providerName: string,
  skill: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, posterUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '⚡ Someone accepted your gig!',
      body: `${providerName} accepted your ${skill} gig.`,
      sound: 'default',
      priority: 'high',
      data: { type: 'gig_accepted' },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigAcceptedPush:', e);
    return false;
  }
}

/** gig_confirmed — to selected provider */
export async function sendGigConfirmedPush(
  supabase: SupabaseClient,
  providerUserId: string,
  title: string,
  dateNeeded: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, providerUserId);
  if (!token) return false;
  const expo = getExpo();
  const dateStr = dateNeeded ? new Date(dateNeeded).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '✅ You got the gig!',
      body: `You've been selected for ${title} — ${dateStr}`,
      sound: 'default',
      priority: 'high',
      data: { type: 'gig_confirmed' },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigConfirmedPush:', e);
    return false;
  }
}

/** gig_expired — to poster when no provider found in time */
export async function sendGigExpiredPush(
  supabase: SupabaseClient,
  posterUserId: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, posterUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '😔 Your gig expired',
      body: 'No provider was found. You have not been charged.',
      sound: 'default',
      data: { type: 'gig_expired' },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigExpiredPush:', e);
    return false;
  }
}

/** gig_starting_soon — to poster and provider ~1h before */
export async function sendGigStartingSoonPush(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  dateNeeded: string,
  address: string | null
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, userId);
  if (!token) return false;
  const expo = getExpo();
  const timeStr = dateNeeded ? new Date(dateNeeded).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '';
  const body = address ? `${title} starts at ${timeStr}. ${address}` : `${title} starts at ${timeStr}`;
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '⏰ Gig starting in 1 hour',
      body,
      sound: 'default',
      data: { type: 'gig_starting_soon' },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigStartingSoonPush:', e);
    return false;
  }
}

/** gig_rating_received — prompt poster to rate provider ~24h after completion */
export async function sendGigRatingPromptPush(
  supabase: SupabaseClient,
  posterUserId: string,
  providerName: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, posterUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '⭐ Rate your gig',
      body: `How did ${providerName} do? Share your feedback.`,
      sound: 'default',
      data: { type: 'gig_rating_received' },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigRatingPromptPush:', e);
    return false;
  }
}

/** gig_payment — to creator when gig is completed and wallet is credited (WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET) */
export async function sendGigPaymentPush(
  supabase: SupabaseClient,
  creatorUserId: string,
  payload: { amount: number; currency: string; gigTitle: string; gigId: string }
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, creatorUserId);
  if (!token) return false;
  const expo = getExpo();
  const symbol = payload.currency === 'GBP' ? '£' : payload.currency === 'EUR' ? '€' : payload.currency === 'NGN' ? '₦' : '$';
  const amountStr = `${symbol}${payload.amount.toFixed(2)}`;
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '💰 Payment received!',
      body: `${amountStr} from "${payload.gigTitle}" is in your SoundBridge wallet.`,
      sound: 'default',
      priority: 'high',
      data: { type: 'gig_payment', gigId: payload.gigId, deepLink: 'soundbridge://wallet' },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigPaymentPush:', e);
    return false;
  }
}

/** opportunity — new planned opportunity near creator */
export async function sendOpportunityPush(
  supabase: SupabaseClient,
  userId: string,
  opportunityId: string,
  skill: string,
  city: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, userId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: '📢 New Opportunity Near You',
      body: `Looking for a ${skill} · ${city}`,
      sound: 'default',
      priority: 'normal',
      data: {
        type: 'opportunity',
        opportunityId,
        skill,
        city,
        deepLink: `soundbridge://opportunity/${opportunityId}`,
      },
    }]);
    return true;
  } catch (e) {
    console.error('sendOpportunityPush:', e);
    return false;
  }
}
