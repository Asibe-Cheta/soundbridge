import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from('venue_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    if (!data) {
      const { data: inserted, error: insertErr } = await service
        .from('venue_notification_preferences')
        .insert({ user_id: user.id })
        .select('*')
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({ preferences: inserted }, { headers: corsHeaders });
    }

    return NextResponse.json({ preferences: data }, { headers: corsHeaders });
  } catch (e) {
    console.error('[venue-notification-preferences GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};

    if (typeof body.opportunity_scouting_enabled === 'boolean') {
      updates.opportunity_scouting_enabled = body.opportunity_scouting_enabled;
    }
    if (typeof body.notifications_enabled === 'boolean') {
      updates.notifications_enabled = body.notifications_enabled;
    }
    if (body.min_budget !== undefined) updates.min_budget = body.min_budget;
    if (body.max_budget !== undefined) updates.max_budget = body.max_budget;
    if (Array.isArray(body.preferred_venue_types)) {
      updates.preferred_venue_types = body.preferred_venue_types;
    }
    if (body.notification_radius_km !== undefined) {
      updates.notification_radius_km = body.notification_radius_km;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400, headers: corsHeaders });
    }

    const service = createServiceClient();

    const { data: existing } = await service
      .from('venue_notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await service
        .from('venue_notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
      result = data;
    } else {
      const { data, error } = await service
        .from('venue_notification_preferences')
        .insert({ user_id: user.id, ...updates })
        .select('*')
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
      result = data;
    }

    return NextResponse.json({ preferences: result }, { headers: corsHeaders });
  } catch (e) {
    console.error('[venue-notification-preferences PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
