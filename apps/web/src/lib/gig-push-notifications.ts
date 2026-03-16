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
    requesterId: string;
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
    channelId: 'urgent_gigs' as const,
    sound: 'default' as const,
    priority: 'high' as const,
    data: {
      type: 'urgent_gig',
      gigId: payload.gigId,
      userId: payload.requesterId,
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

/** gig_accepted — to requester when provider accepts (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD §8) */
export async function sendGigAcceptedPush(
  supabase: SupabaseClient,
  posterUserId: string,
  providerName: string,
  gigId: string,
  providerUserId: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, posterUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: 'Provider Accepted',
      body: `${providerName} accepted your gig request`,
      sound: 'default',
      priority: 'high',
      channelId: 'urgent_gigs',
      data: { type: 'gig_accepted', gigId, userId: providerUserId },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigAcceptedPush:', e);
    return false;
  }
}

/** gig_confirmed — to selected provider (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD §9) */
export async function sendGigConfirmedPush(
  supabase: SupabaseClient,
  providerUserId: string,
  requesterName: string,
  gigId: string,
  requesterUserId: string,
  title: string,
  dateNeeded: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, providerUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: 'You Got the Gig!',
      body: `${requesterName} selected you for the gig`,
      sound: 'default',
      priority: 'high',
      channelId: 'urgent_gigs',
      data: { type: 'gig_confirmed', gigId, userId: requesterUserId },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigConfirmedPush:', e);
    return false;
  }
}

/** gig_expired — to requester when no provider found; refund triggered (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD §11) */
export async function sendGigExpiredPush(
  supabase: SupabaseClient,
  posterUserId: string,
  gigId: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, posterUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: 'Gig Expired',
      body: 'No provider was found. Your payment has been refunded.',
      sound: 'default',
      channelId: 'urgent_gigs',
      data: { type: 'gig_expired', gigId },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigExpiredPush:', e);
    return false;
  }
}

/** gig_starting_soon — to poster and provider ~1h before (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD §10) */
export async function sendGigStartingSoonPush(
  supabase: SupabaseClient,
  userId: string,
  gigId: string,
  title: string,
  dateNeeded: string,
  address: string | null
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, userId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: 'Gig Starting Soon',
      body: 'Your gig starts in 1 hour',
      sound: 'default',
      channelId: 'urgent_gigs',
      data: { type: 'gig_starting_soon', gigId },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigStartingSoonPush:', e);
    return false;
  }
}

/** gig_rating_received — prompt one party to rate the other (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD §14) */
export async function sendGigRatingPromptPush(
  supabase: SupabaseClient,
  recipientUserId: string,
  otherPartyDisplayName: string,
  gigId: string,
  projectId: string
): Promise<boolean> {
  const token = await getPushTokenForUser(supabase, recipientUserId);
  if (!token) return false;
  const expo = getExpo();
  try {
    await expo.sendPushNotificationsAsync([{
      to: token,
      title: 'Rate Your Experience',
      body: `How was the gig? Leave a rating for ${otherPartyDisplayName}`,
      sound: 'default',
      channelId: 'social',
      data: { type: 'gig_rating_received', gigId, projectId },
    }]);
    return true;
  } catch (e) {
    console.error('sendGigRatingPromptPush:', e);
    return false;
  }
}

/** gig_payment — to provider when gig completed and wallet credited (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD §12) */
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
      title: 'Payment Received',
      body: `${amountStr} has been added to your wallet for completing the gig`,
      sound: 'default',
      priority: 'high',
      channelId: 'tips',
      data: { type: 'gig_payment', gigId: payload.gigId, amount: Math.round(payload.amount * 100) },
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
