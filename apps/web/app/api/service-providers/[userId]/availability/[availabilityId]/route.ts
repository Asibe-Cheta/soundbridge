import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { enrichAvailabilityRow } from '@/src/lib/service-provider-response';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; availabilityId: string }> },
) {
  const { userId, availabilityId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only update your own availability slots' }, { status: 403, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400, headers: corsHeaders });
  }

  type AvailabilityRow = Database['public']['Tables']['service_provider_availability']['Row'];
  type AvailabilityUpdate = Database['public']['Tables']['service_provider_availability']['Update'];

  const supabaseClient = supabase as any;

  const updatePayload: AvailabilityUpdate = {
    updated_at: new Date().toISOString(),
  };

  const startStr = body.start_time ?? body.startTime ?? body.start_at ?? body.startAt;
  const endStr = body.end_time ?? body.endTime ?? body.end_at ?? body.endAt;

  if (startStr !== undefined) {
    const startDate = new Date(String(startStr));
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'start_time must be a valid ISO string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.start_time = startDate.toISOString();
  }

  if (endStr !== undefined) {
    const endDate = new Date(String(endStr));
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'end_time must be a valid ISO string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.end_time = endDate.toISOString();
  }

  if (startStr !== undefined && endStr !== undefined) {
    const startDate = new Date(String(startStr));
    const endDate = new Date(String(endStr));
    if (endDate <= startDate) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400, headers: corsHeaders });
    }
  }

  if (body.is_recurring !== undefined || body.isRecurring !== undefined) {
    updatePayload.is_recurring = Boolean(body.is_recurring ?? body.isRecurring);
  }

  if (body.recurrence !== undefined || body.recurrenceRule !== undefined) {
    const raw = body.recurrence ?? body.recurrenceRule;
    const recurrence =
      raw === null || raw === undefined
        ? null
        : String(raw).trim() === ''
          ? null
          : String(raw);
    const normalized = recurrence?.toLowerCase() ?? null;
    if (normalized && !new Set(['none', 'daily', 'weekly', 'monthly']).has(normalized)) {
      return NextResponse.json(
        { error: "recurrence must be one of: 'none', 'daily', 'weekly', 'monthly'" },
        { status: 400, headers: corsHeaders },
      );
    }
    updatePayload.recurrence_rule = normalized === 'none' ? 'none' : recurrence;
  }

  if (body.is_bookable !== undefined || body.isBookable !== undefined) {
    updatePayload.is_bookable = Boolean(body.is_bookable ?? body.isBookable);
  }

  if (body.timezone !== undefined) {
    const tzRaw = body.timezone;
    updatePayload.timezone =
      tzRaw === null || tzRaw === undefined || String(tzRaw).trim() === '' ? 'UTC' : String(tzRaw);
  }

  const { data: updateData, error: updateError } = await supabaseClient
    .from('service_provider_availability')
    .update(updatePayload)
    .eq('provider_id', userId)
    .eq('id', availabilityId)
    .select('*')
    .single();

  const data = (updateData ?? null) as AvailabilityRow | null;

  if (updateError || !data) {
    return NextResponse.json(
      { error: 'Failed to update availability slot', details: updateError?.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { availability: enrichAvailabilityRow(data as unknown as Record<string, unknown>) },
    { headers: corsHeaders },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; availabilityId: string }> },
) {
  const { userId, availabilityId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only delete your own availability slots' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;

  const { error: deleteError } = await supabaseClient
    .from('service_provider_availability')
    .delete()
    .eq('provider_id', userId)
    .eq('id', availabilityId);

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete availability slot', details: deleteError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}

