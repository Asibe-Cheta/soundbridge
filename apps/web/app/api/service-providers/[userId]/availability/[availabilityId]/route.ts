import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
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

  let body: Partial<{
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    recurrenceRule: string | null;
    isBookable: boolean;
  }>;

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

  if (body.startTime !== undefined) {
    const startDate = new Date(body.startTime);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'startTime must be a valid ISO string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.start_time = startDate.toISOString();
  }

  if (body.endTime !== undefined) {
    const endDate = new Date(body.endTime);
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'endTime must be a valid ISO string' }, { status: 400, headers: corsHeaders });
    }
    updatePayload.end_time = endDate.toISOString();
  }

  if (body.startTime && body.endTime) {
    const startDate = new Date(body.startTime);
    const endDate = new Date(body.endTime);
    if (endDate <= startDate) {
      return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400, headers: corsHeaders });
    }
  }

  if (body.isRecurring !== undefined) {
    updatePayload.is_recurring = body.isRecurring;
  }

  if (body.recurrenceRule !== undefined) {
    updatePayload.recurrence_rule = body.recurrenceRule;
  }

  if (body.isBookable !== undefined) {
    updatePayload.is_bookable = body.isBookable;
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

  return NextResponse.json({ availability: data }, { headers: corsHeaders });
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

