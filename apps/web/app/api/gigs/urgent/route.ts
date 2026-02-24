/**
 * POST /api/gigs/urgent — Create urgent gig + Stripe PaymentIntent (hold); matching runs after payment confirmed
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const body = await request.json().catch(() => ({}));
    const {
      skill_required,
      genre,
      date_needed,
      duration_hours,
      location_lat,
      location_lng,
      location_address,
      location_radius_km = 20,
      payment_amount,
      payment_currency = 'GBP',
      description,
    } = body;

    if (!skill_required || !date_needed || payment_amount == null || payment_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'skill_required, date_needed, and payment_amount (positive) are required' },
        { status: 400, headers: CORS }
      );
    }
    const lat = location_lat != null ? Number(location_lat) : null;
    const lng = location_lng != null ? Number(location_lng) : null;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, error: 'location_lat and location_lng are required' },
        { status: 400, headers: CORS }
      );
    }

    const dateNeeded = new Date(date_needed);
    if (Number.isNaN(dateNeeded.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date_needed' }, { status: 400, headers: CORS });
    }
    const expiresAt = new Date(dateNeeded);
    expiresAt.setHours(expiresAt.getHours() + 4);

    if (!stripe) {
      return NextResponse.json({ success: false, error: 'Payment system not configured' }, { status: 500, headers: CORS });
    }

    const amountPence = Math.round(Number(payment_amount) * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: (payment_currency || 'GBP').toString().toLowerCase(),
      capture_method: 'manual',
      metadata: {
        gig_source: 'urgent',
        requester_user_id: user.id,
        skill_required: String(skill_required),
      },
      description: `Urgent gig: ${skill_required}`,
    });

    const service = createServiceClient();
    const title = `Urgent: ${String(skill_required)}`;
    const { data: gig, error: insertErr } = await service
      .from('opportunity_posts')
      .insert({
        user_id: user.id,
        type: 'job',
        title,
        description: description ? String(description).slice(0, 1000) : title,
        skills_needed: [String(skill_required)],
        gig_type: 'urgent',
        skill_required: String(skill_required),
        genre: Array.isArray(genre) ? genre.map(String) : null,
        location_lat: lat,
        location_lng: lng,
        location_address: location_address ? String(location_address) : null,
        location_radius_km: Math.min(100, Math.max(1, Number(location_radius_km) || 20)),
        duration_hours: duration_hours != null ? Number(duration_hours) : null,
        payment_amount: Number(payment_amount),
        payment_currency: (payment_currency || 'GBP').toString(),
        payment_status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        date_needed: dateNeeded.toISOString(),
        expires_at: expiresAt.toISOString(),
        urgent_status: 'searching',
        is_active: true,
        visibility: 'public',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('gigs/urgent insert:', insertErr);
      return NextResponse.json({ success: false, error: 'Failed to create gig' }, { status: 500, headers: CORS });
    }

    const { count } = await service
      .from('user_availability')
      .select('*', { count: 'exact', head: true })
      .eq('available_for_urgent_gigs', true)
      .neq('user_id', user.id);
    const estimated_matches = typeof count === 'number' ? Math.min(count, 10) : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          gig_id: gig.id,
          stripe_client_secret: paymentIntent.client_secret ?? null,
          estimated_matches,
        },
      },
      { headers: CORS }
    );
  } catch (e) {
    console.error('POST /api/gigs/urgent:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
