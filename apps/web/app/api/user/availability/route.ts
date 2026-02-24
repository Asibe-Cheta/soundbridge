/**
 * GET /api/user/availability — Return current user's availability (create with defaults if not exists)
 * PATCH /api/user/availability — Update availability fields
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const service = createServiceClient();
    let { data: row, error } = await service
      .from('user_availability')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('user_availability GET:', error);
      return NextResponse.json({ success: false, error: 'Failed to load availability' }, { status: 500, headers: CORS });
    }

    if (!row) {
      const { data: inserted, error: insertErr } = await service
        .from('user_availability')
        .insert({
          user_id: user.id,
          available_for_urgent_gigs: false,
          max_radius_km: 20,
          rate_negotiable: false,
          max_notifications_per_day: 5,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertErr) {
        console.error('user_availability insert:', insertErr);
        return NextResponse.json({ success: false, error: 'Failed to create availability' }, { status: 500, headers: CORS });
      }
      row = inserted;
    }

    return NextResponse.json({ success: true, data: row }, { headers: CORS });
  } catch (e) {
    console.error('GET /api/user/availability:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}

const PATCH_FIELDS = [
  'available_for_urgent_gigs', 'current_lat', 'current_lng', 'general_area', 'general_area_lat', 'general_area_lng',
  'max_radius_km', 'hourly_rate', 'per_gig_rate', 'rate_negotiable', 'availability_schedule',
  'dnd_start', 'dnd_end', 'max_notifications_per_day',
] as const;

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of PATCH_FIELDS) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (Object.keys(update).length <= 1) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400, headers: CORS });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from('user_availability')
      .upsert({ user_id: user.id, ...update }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('user_availability PATCH:', error);
      return NextResponse.json({ success: false, error: 'Failed to update availability' }, { status: 500, headers: CORS });
    }
    return NextResponse.json({ success: true, data }, { headers: CORS });
  } catch (e) {
    console.error('PATCH /api/user/availability:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
