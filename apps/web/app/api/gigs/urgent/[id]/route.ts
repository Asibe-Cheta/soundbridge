/**
 * GET /api/gigs/urgent/:id — Full gig + requester profile + distance_km if viewer is provider
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

    const { data: gig, error } = await service
      .from('opportunity_posts')
      .select('id, user_id, gig_type, skill_required, genre, date_needed, duration_hours, payment_amount, payment_currency, location_address, location_lat, location_lng, location_radius_km, description, expires_at, urgent_status, created_at')
      .eq('id', id)
      .eq('gig_type', 'urgent')
      .single();

    if (error || !gig) {
      return NextResponse.json({ success: false, error: 'Gig not found' }, { status: 404, headers: CORS });
    }

    const isRequester = gig.user_id === user.id;
    const { data: requester } = await service
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', gig.user_id)
      .single();

    const { data: ratingRow } = await service
      .from('gig_ratings')
      .select('overall_rating')
      .eq('ratee_id', gig.user_id);
    const avgRating = ratingRow?.length
      ? ratingRow.reduce((s, r) => s + Number(r.overall_rating), 0) / ratingRow.length
      : null;
    const { count: reviewCount } = await service
      .from('gig_ratings')
      .select('*', { count: 'exact', head: true })
      .eq('ratee_id', gig.user_id);

    let distance_km: number | null = null;
    if (!isRequester && gig.location_lat != null && gig.location_lng != null) {
      const { data: myAvail } = await service
        .from('user_availability')
        .select('current_lat, current_lng, general_area_lat, general_area_lng')
        .eq('user_id', user.id)
        .single();
      const myLat = myAvail?.current_lat ?? myAvail?.general_area_lat;
      const myLng = myAvail?.current_lng ?? myAvail?.general_area_lng;
      if (myLat != null && myLng != null) {
        distance_km = Math.round(haversineKm(Number(gig.location_lat), Number(gig.location_lng), Number(myLat), Number(myLng)) * 10) / 10;
      }
    }

    const payload = {
      id: gig.id,
      gig_type: gig.gig_type,
      skill_required: gig.skill_required,
      genre: gig.genre,
      date_needed: gig.date_needed,
      duration_hours: gig.duration_hours,
      payment_amount: gig.payment_amount,
      payment_currency: gig.payment_currency,
      location_address: gig.location_address,
      status: gig.urgent_status ?? 'searching',
      expires_at: gig.expires_at,
      description: gig.description,
      requester: requester ? {
        id: requester.id,
        display_name: requester.display_name ?? 'User',
        avatar_url: requester.avatar_url,
        rating: avgRating ?? 0,
        review_count: reviewCount ?? 0,
      } : null,
      distance_km,
    };

    return NextResponse.json({ success: true, data: payload }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/gigs/urgent/[id]:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
