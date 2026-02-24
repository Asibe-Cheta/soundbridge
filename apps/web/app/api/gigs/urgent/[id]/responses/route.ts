/**
 * GET /api/gigs/urgent/:id/responses — Requester only; list responses with provider profiles
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { haversineKm } from '@/src/lib/haversine';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const service = createServiceClient();

    const { data: gig, error: gigErr } = await service
      .from('opportunity_posts')
      .select('id, user_id, location_lat, location_lng')
      .eq('id', id)
      .single();

    if (gigErr || !gig || gig.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Gig not found or not requester' }, { status: 404, headers: CORS });
    }

    const { data: responses } = await service
      .from('gig_responses')
      .select('id, provider_id, status, response_time_seconds, message, responded_at, notified_at')
      .eq('gig_id', id)
      .order('responded_at', { ascending: false, nullsFirst: false });

    if (!responses?.length) {
      return NextResponse.json({ success: true, data: [] }, { headers: CORS });
    }

    const providerIds = [...new Set(responses.map((r: { provider_id: string }) => r.provider_id))];
    const { data: profiles } = await service
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', providerIds);

    const { data: availRows } = await service
      .from('user_availability')
      .select('user_id, current_lat, current_lng, general_area_lat, general_area_lng, hourly_rate, per_gig_rate')
      .in('user_id', providerIds);
    const availByUser = new Map((availRows ?? []).map((a: { user_id: string }) => [a.user_id, a]));

    const { data: allRatings } = await service
      .from('gig_ratings')
      .select('ratee_id, overall_rating')
      .in('ratee_id', providerIds);
    const ratingByUser = new Map<string, { sum: number; count: number }>();
    for (const r of allRatings ?? []) {
      const key = r.ratee_id;
      if (!ratingByUser.has(key)) ratingByUser.set(key, { sum: 0, count: 0 });
      ratingByUser.get(key)!.sum += Number(r.overall_rating);
      ratingByUser.get(key)!.count += 1;
    }

    const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));
    const gigLat = gig.location_lat != null ? Number(gig.location_lat) : null;
    const gigLng = gig.location_lng != null ? Number(gig.location_lng) : null;

    const data = responses.map((r: {
      id: string;
      provider_id: string;
      status: string;
      response_time_seconds: number | null;
      message: string | null;
      responded_at: string | null;
    }) => {
      const profile = profileMap.get(r.provider_id);
      const avail = availByUser.get(r.provider_id);
      const rating = ratingByUser.get(r.provider_id);
      let distance_km: number | null = null;
      if (gigLat != null && gigLng != null && avail) {
        const lat = avail.current_lat ?? avail.general_area_lat;
        const lng = avail.current_lng ?? avail.general_area_lng;
        if (lat != null && lng != null) {
          distance_km = Math.round(haversineKm(gigLat, gigLng, Number(lat), Number(lng)) * 10) / 10;
        }
      }
      return {
        id: r.id,
        provider: {
          id: r.provider_id,
          display_name: profile?.display_name ?? 'User',
          avatar_url: profile?.avatar_url ?? null,
          rating: rating ? rating.sum / rating.count : 0,
          review_count: rating?.count ?? 0,
          distance_km,
          hourly_rate: avail?.hourly_rate ?? null,
          per_gig_rate: avail?.per_gig_rate ?? null,
        },
        status: r.status,
        response_time_seconds: r.response_time_seconds,
        message: r.message,
        responded_at: r.responded_at,
      };
    });

    return NextResponse.json({ success: true, data }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/gigs/urgent/[id]/responses:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
