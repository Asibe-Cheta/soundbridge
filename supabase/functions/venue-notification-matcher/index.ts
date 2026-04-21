import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'
import { isWithinTimeWindow } from './_lib/time-window.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatRate(dailyRate: number | null, hourlyRate: number | null, currency: string): string {
  const symbol = currency === 'NGN' ? '₦' : '£'
  if (hourlyRate) return `${symbol}${hourlyRate.toLocaleString()}/hr`
  if (dailyRate) return `${symbol}${dailyRate.toLocaleString()}/day`
  return 'Contact for pricing'
}

function isValidExpoPushToken(token: string | null | undefined): token is string {
  if (!token) return false
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { venue_id } = await req.json()
    console.log('[venue-notification-matcher] invoked', { venue_id })
    if (!venue_id) {
      return new Response(JSON.stringify({ error: 'venue_id required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, city, country, latitude, longitude, venue_type, daily_rate, hourly_rate, currency, owner_id')
      .eq('id', venue_id)
      .single()

    if (venueError || !venue) {
      console.error('[venue-notification-matcher] venue lookup failed', {
        venue_id,
        error: venueError?.message,
      })
      return new Response(JSON.stringify({ error: 'Venue not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (venue.latitude == null || venue.longitude == null) {
      console.log('[venue-notification-matcher] venue has no coordinates', { venue_id })
      return new Response(JSON.stringify({ matched: 0, reason: 'No coordinates' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: preferences, error: prefError } = await supabase
      .from('venue_notification_preferences')
      .select('user_id, min_budget, max_budget, preferred_venue_types, preferred_location_lat, preferred_location_lng, notification_radius_km, notifications_enabled')
      .eq('notifications_enabled', true)
      .neq('user_id', venue.owner_id)

    if (prefError) {
      console.error('[venue-notification-matcher] preference query failed', {
        venue_id,
        error: prefError.message,
      })
      return new Response(JSON.stringify({ matched: 0, reason: 'Preference query failed' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!preferences?.length) {
      console.log('[venue-notification-matcher] no enabled preferences', { venue_id })
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    console.log('[venue-notification-matcher] loaded preferences', {
      venue_id,
      total: preferences.length,
    })

    const matchingUserIds: string[] = []

    for (const pref of preferences) {
      const checkLat = pref.preferred_location_lat ?? venue.latitude
      const checkLng = pref.preferred_location_lng ?? venue.longitude
      const dist = haversineKm(checkLat, checkLng, venue.latitude, venue.longitude)
      const radiusKm = typeof pref.notification_radius_km === 'number' ? pref.notification_radius_km : 25
      if (dist > radiusKm) continue

      if (pref.preferred_venue_types?.length > 0 && venue.venue_type) {
        const normalised = venue.venue_type.toLowerCase().replace(/\s+/g, '_')
        const prefNormalised = pref.preferred_venue_types.map((t: string) => t.toLowerCase().replace(/\s+/g, '_'))
        if (!prefNormalised.includes(normalised)) continue
      }

      // Match against hourly rate (primary), fall back to daily rate
      const rate = venue.hourly_rate ?? venue.daily_rate
      if (rate !== null) {
        if (pref.min_budget !== null && rate < pref.min_budget) continue
        if (pref.max_budget !== null && rate > pref.max_budget) continue
      }

      matchingUserIds.push(pref.user_id)
    }

    if (matchingUserIds.length === 0) {
      console.log('[venue-notification-matcher] no users matched after filters', { venue_id })
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: quietHourRows } = await supabase
      .from('notification_preferences')
      .select('user_id, start_hour, end_hour, timezone')
      .in('user_id', matchingUserIds)

    const quietHourMap = new Map(
      (quietHourRows ?? []).map((r) => [r.user_id, r]),
    )

    const sendableUserIds = matchingUserIds.filter((uid) => {
      const prefs = quietHourMap.get(uid)
      if (!prefs) return true
      return isWithinTimeWindow(prefs.start_hour, prefs.end_hour, prefs.timezone ?? 'UTC')
    })

    if (sendableUserIds.length === 0) {
      console.log('[venue-notification-matcher] all matched users in quiet hours', {
        venue_id,
        matched: matchingUserIds.length,
      })
      return new Response(
        JSON.stringify({ matched: matchingUserIds.length, sent: 0, reason: 'Quiet hours' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', sendableUserIds)
    const { data: tokenRows } = await supabase
      .from('user_push_tokens')
      .select('user_id, push_token, active, last_used_at')
      .in('user_id', sendableUserIds)
      .eq('active', true)
      .not('push_token', 'is', null)
      .order('last_used_at', { ascending: false })

    const fallbackTokenByUserId = new Map<string, string>()
    for (const row of tokenRows ?? []) {
      const uid = row.user_id as string
      const token = row.push_token as string
      if (!fallbackTokenByUserId.has(uid) && isValidExpoPushToken(token)) {
        fallbackTokenByUserId.set(uid, token)
      }
    }

    const tokensByUserId = new Map<string, string>()
    for (const uid of sendableUserIds) {
      const profileToken = (profiles ?? []).find((p) => p.id === uid)?.expo_push_token as string | null | undefined
      if (isValidExpoPushToken(profileToken)) {
        tokensByUserId.set(uid, profileToken)
        continue
      }
      const fallback = fallbackTokenByUserId.get(uid)
      if (fallback) tokensByUserId.set(uid, fallback)
    }

    if (tokensByUserId.size === 0) {
      console.log('[venue-notification-matcher] no expo tokens found for sendable users', {
        venue_id,
        sendable: sendableUserIds.length,
        profiles_with_token: (profiles ?? []).filter((p) => isValidExpoPushToken(p.expo_push_token as string | null | undefined)).length,
        fallback_tokens: fallbackTokenByUserId.size,
      })
      return new Response(JSON.stringify({ matched: 0, reason: 'No push tokens' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const location = [venue.city, venue.country].filter(Boolean).join(', ') || 'your area'
    const rateString = formatRate(venue.daily_rate, venue.hourly_rate, venue.currency ?? 'GBP')

    const messages = Array.from(tokensByUserId.entries()).map(([uid, token]) => ({
        to: token,
        sound: 'default',
        title: 'A venue near you matches your budget',
        body: `${venue.name} in ${location} is available from ${rateString}. Tap to view.`,
        data: { type: 'venue_match', venueId: venue.id, userId: uid, deepLink: `soundbridge://venue/${venue.id}` },
        channelId: 'default',
      }))

    const receipts = await sendPushNotifications(messages)
    const sent = receipts.filter((r) => r.status === 'ok').length
    const failed = receipts.length - sent
    console.log('[venue-notification-matcher] push send complete', {
      venue_id,
      matched: matchingUserIds.length,
      sendable: sendableUserIds.length,
      with_tokens: tokensByUserId.size,
      sent,
      failed,
    })

    return new Response(JSON.stringify({ matched: matchingUserIds.length, sent }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('venue-notification-matcher error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
