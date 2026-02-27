/**
 * Urgent gig matching: run after payment_intent.succeeded for gig_source=urgent
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md §3
 * WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md — payload + rate limits + DND/prefs
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { haversineKm } from './haversine';
import { sendUrgentGigPush } from './gig-push-notifications';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export interface GigRow {
  id: string;
  user_id: string;
  skill_required: string | null;
  genre: string[] | null;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_km: number;
  duration_hours: number | null;
  payment_amount: number;
  location_address: string | null;
  date_needed: string | null;
  title: string | null;
}

interface CandidateRow {
  user_id: string;
  current_lat: number | null;
  current_lng: number | null;
  general_area_lat: number | null;
  general_area_lng: number | null;
  max_radius_km: number;
  hourly_rate: number | null;
  per_gig_rate: number | null;
  rate_negotiable: boolean;
  availability_schedule: Record<string, { available?: boolean; hours?: string }> | null;
  dnd_start: string | null;
  dnd_end: string | null;
  max_notifications_per_day: number;
  skills: string[];
  genres: string[] | null;
  avg_rating: number | null;
  review_count: number;
}

/** DND check in user's timezone (WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md) */
function isInDndInTimezone(dndStart: string | null, dndEnd: string | null, timezone: string): boolean {
  if (!dndStart || !dndEnd) return false;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const nowMins = hour * 60 + minute;
  const [sh, sm] = dndStart.split(':').map(Number);
  const [eh, em] = dndEnd.split(':').map(Number);
  const startMins = sh * 60 + (sm || 0);
  let endMins = eh * 60 + (em || 0);
  if (endMins <= startMins) endMins += 24 * 60;
  return nowMins >= startMins && nowMins < endMins;
}

function availabilityScore(schedule: Record<string, { available?: boolean; hours?: string }> | null, now: Date): number {
  if (!schedule) return 0.5;
  const day = DAY_NAMES[now.getDay()];
  const daySchedule = schedule[day];
  if (!daySchedule?.available) return 0;
  const hours = daySchedule.hours;
  if (!hours || hours === 'all_day') return 1;
  const match = hours.match(/^(\d{1,2}):?(\d{2})?-?(\d{1,2})?:?(\d{2})?$/);
  if (!match) return 0.5;
  const startH = parseInt(match[1], 10);
  const startM = parseInt(match[2] || '0', 10);
  const endH = match[3] != null ? parseInt(match[3], 10) : 23;
  const endM = match[4] != null ? parseInt(match[4], 10) : 59;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;
  if (endMins <= startMins) endMins += 24 * 60;
  return nowMins >= startMins && nowMins < endMins ? 1 : 0;
}

function skillGenreScore(
  gigSkill: string | null,
  gigGenres: string[] | null,
  providerSkills: string[],
  providerGenres: string[] | null
): number {
  const skillMatch = gigSkill && providerSkills.some((s) => s.toLowerCase().includes(gigSkill.toLowerCase())) ? 1 : 0;
  let genreOverlap = 0;
  if (gigGenres?.length && providerGenres?.length) {
    const set = new Set(providerGenres.map((g) => g.toLowerCase()));
    const overlap = gigGenres.filter((g) => set.has(g.toLowerCase())).length;
    genreOverlap = overlap / gigGenres.length;
  } else if (!gigGenres?.length) genreOverlap = 1;
  return skillMatch * 0.7 + genreOverlap * 0.3;
}

export async function runUrgentGigMatching(
  supabase: SupabaseClient,
  paymentIntentId: string
): Promise<{ gigId: string; matchedCount: number } | null> {
  const { data: gig, error: gigErr } = await supabase
    .from('opportunity_posts')
    .select('id, user_id, skill_required, genre, location_lat, location_lng, location_radius_km, duration_hours, payment_amount, payment_currency, location_address, date_needed, title')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('gig_type', 'urgent')
    .single();

  if (gigErr || !gig) {
    console.error('Urgent gig not found for PI:', paymentIntentId, gigErr);
    return null;
  }

  const requesterId = gig.user_id;
  await supabase
    .from('opportunity_posts')
    .update({ payment_status: 'escrowed', updated_at: new Date().toISOString() })
    .eq('id', gig.id);

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: availabilityRows } = await supabase
    .from('user_availability')
    .select('user_id, current_lat, current_lng, general_area_lat, general_area_lng, max_radius_km, hourly_rate, per_gig_rate, rate_negotiable, availability_schedule, dnd_start, dnd_end, max_notifications_per_day')
    .eq('available_for_urgent_gigs', true)
    .neq('user_id', requesterId)
    .or(`last_location_update.gte.${thirtyMinAgo},general_area_lat.not.is.null`);

  if (!availabilityRows?.length) {
    return { gigId: gig.id, matchedCount: 0 };
  }

  const userIds = availabilityRows.map((r) => r.user_id);
  const [skillsRes, genresRes, ratingsRes, profilesRes] = await Promise.all([
    supabase.from('profile_skills').select('user_id, skill').in('user_id', userIds).then((r) => (r.error ? { data: [] as { user_id: string; skill: string }[] } : r)),
    supabase.from('profiles').select('id, genres').in('id', userIds),
    supabase.from('gig_ratings').select('ratee_id, overall_rating').in('ratee_id', userIds),
    supabase.from('profiles').select('id, timezone, notification_preferences').in('id', userIds),
  ]);
  const profileByUser = new Map<string, { timezone?: string | null; notification_preferences?: Record<string, unknown> | null }>(
    (profilesRes.data ?? []).map((p: { id: string; timezone?: string; notification_preferences?: Record<string, unknown> }) => [p.id, { timezone: p.timezone, notification_preferences: p.notification_preferences }])
  );

  const skillsByUser = new Map<string, string[]>();
  for (const row of (skillsRes.data ?? []) as { user_id: string; skill: string }[]) {
    const u = row.user_id;
    if (!skillsByUser.has(u)) skillsByUser.set(u, []);
    skillsByUser.get(u)!.push(row.skill);
  }
  const genresByUser = new Map<string, string[]>(genresRes.data?.map((p: { id: string; genres: string[] | null }) => [p.id, p.genres ?? []]) ?? []);
  const ratingByUser = new Map<string, { sum: number; count: number }>();
  for (const r of ratingsRes.data ?? []) {
    const id = (r as { ratee_id: string; overall_rating: number }).ratee_id;
    const rating = (r as { overall_rating: number }).overall_rating;
    if (!ratingByUser.has(id)) ratingByUser.set(id, { sum: 0, count: 0 });
    const x = ratingByUser.get(id)!;
    x.sum += rating;
    x.count += 1;
  }

  const now = new Date();
  const gigLat = gig.location_lat ?? 0;
  const gigLng = gig.location_lng ?? 0;
  const radiusKm = Math.min(Number(gig.location_radius_km) || 20, 100);
  const paymentAmount = Number(gig.payment_amount) || 0;
  const durationHours = Number(gig.duration_hours) || 1;

  const scored: { user_id: string; score: number; distance_km: number; row: (typeof availabilityRows)[0] }[] = [];

  for (const row of availabilityRows) {
    const profile = profileByUser.get(row.user_id);
    const tz = profile?.timezone || 'UTC';
    if (isInDndInTimezone(row.dnd_start, row.dnd_end, tz)) continue;
    const urgentEnabled = profile?.notification_preferences?.urgentGigNotificationsEnabled;
    if (urgentEnabled === false) continue;

    const avgRating = ratingByUser.get(row.user_id);
    const avg = avgRating && avgRating.count > 0 ? avgRating.sum / avgRating.count : null;
    if (avg != null && avg < 4) continue;

    const providerLat = row.current_lat ?? row.general_area_lat;
    const providerLng = row.current_lng ?? row.general_area_lng;
    if (providerLat == null || providerLng == null) continue;

    const distanceKm = haversineKm(providerLat, providerLng, gigLat, gigLng);
    const maxR = Math.min(radiusKm, Number(row.max_radius_km) || 20);
    if (distanceKm > maxR) continue;

    const distanceScore = Math.max(0, 1 - distanceKm / radiusKm) * 0.25;
    const sgScore = skillGenreScore(gig.skill_required, gig.genre, skillsByUser.get(row.user_id) ?? [], genresByUser.get(row.user_id) ?? null) * 0.4;
    const ratingScore = (avg != null ? (avg - 1) / 4 : 0.6) * 0.2;
    const availScore = availabilityScore(row.availability_schedule, now) * 0.1;
    let budgetScore = 0;
    const effectiveRate = row.per_gig_rate != null
      ? Math.min(Number(row.hourly_rate ?? 0) * durationHours, Number(row.per_gig_rate))
      : Number(row.hourly_rate ?? 0) * durationHours;
    if (effectiveRate <= paymentAmount) budgetScore = 1;
    else if (row.rate_negotiable) budgetScore = 0.5;
    budgetScore *= 0.05;

    const total = distanceScore + sgScore + ratingScore + availScore + budgetScore;
    scored.push({ user_id: row.user_id, score: total, distance_km: distanceKm, row });
  }

  scored.sort((a, b) => b.score - a.score);
  const top10 = scored.slice(0, 10);

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const { data: todayCounts } = await supabase
    .from('notification_rate_limits')
    .select('user_id')
    .eq('notification_type', 'urgent_gig')
    .gte('sent_at', todayStartStr);

  const countByUser = new Map<string, number>();
  for (const r of todayCounts ?? []) {
    const u = (r as { user_id: string }).user_id;
    countByUser.set(u, (countByUser.get(u) ?? 0) + 1);
  }

  const toNotify: typeof top10 = [];
  for (const s of top10) {
    const maxPerDay = s.row.max_notifications_per_day ?? 5;
    if ((countByUser.get(s.user_id) ?? 0) >= maxPerDay) continue;
    const { data: recentDeclines } = await supabase
      .from('notification_rate_limits')
      .select('id')
      .eq('user_id', s.user_id)
      .eq('notification_type', 'urgent_gig')
      .eq('action', 'declined')
      .gte('sent_at', twoHoursAgo)
      .order('sent_at', { ascending: false })
      .limit(3);
    if ((recentDeclines?.length ?? 0) >= 3) continue;
    toNotify.push(s);
    countByUser.set(s.user_id, (countByUser.get(s.user_id) ?? 0) + 1);
  }

  const skillLabel = gig.skill_required ?? 'Gig';
  const genreLabel = Array.isArray(gig.genre) && gig.genre.length > 0 ? gig.genre[0] : '';
  const locationLabel = gig.location_address ?? 'Luton';
  const dateNeeded = gig.date_needed ? new Date(gig.date_needed).toISOString() : '';
  const paymentCurrency = (gig as { payment_currency?: string }).payment_currency ?? 'GBP';

  for (const s of toNotify) {
    await supabase.from('gig_responses').insert({
      gig_id: gig.id,
      provider_id: s.user_id,
      status: 'pending',
    });
    await supabase.from('notification_rate_limits').insert({
      user_id: s.user_id,
      notification_type: 'urgent_gig',
      sent_at: now.toISOString(),
      gig_id: gig.id,
    });
  }

  for (const s of toNotify) {
    const bodyParts = [`£${paymentAmount.toFixed(0)}`];
    if (genreLabel) bodyParts.push(genreLabel);
    bodyParts.push(`${s.distance_km.toFixed(1)}km away`);
    bodyParts.push(locationLabel);
    await sendUrgentGigPush(supabase, s.user_id, {
      gigId: gig.id,
      title: `🎺 Urgent Gig: ${skillLabel} Tonight`,
      body: bodyParts.join(' · '),
      distance_km: s.distance_km,
      payment: paymentAmount,
      payment_currency: paymentCurrency,
      skill: skillLabel,
      genre: gig.genre,
      date_needed: dateNeeded,
      location_address: gig.location_address,
    });
  }

  return { gigId: gig.id, matchedCount: toNotify.length };
}
