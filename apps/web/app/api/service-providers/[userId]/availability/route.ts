import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import type { Database } from '@/src/lib/types';

interface AvailabilityPayload {
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  isBookable?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only view your own availability' }, { status: 403, headers: corsHeaders });
  }

  const supabaseClient = supabase as any;
  type AvailabilityRow = Database['public']['Tables']['service_provider_availability']['Row'];
  type AvailabilityInsert = Database['public']['Tables']['service_provider_availability']['Insert'];

  const { data, error: queryError } = await supabaseClient
    .from('service_provider_availability')
    .select('*')
    .eq('provider_id', userId)
    .order('start_time', { ascending: true });

  if (queryError) {
    return NextResponse.json(
      { error: 'Failed to load availability', details: queryError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ availability: data ?? [] }, { headers: corsHeaders });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only add availability to your own profile' }, { status: 403, headers: corsHeaders });
  }

  let body: AvailabilityPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const { startTime, endTime, isRecurring = false, recurrenceRule = null, isBookable = true } = body;

  if (!startTime || !endTime) {
    return NextResponse.json({ error: 'startTime and endTime are required' }, { status: 400, headers: corsHeaders });
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'startTime and endTime must be valid ISO strings' }, { status: 400, headers: corsHeaders });
  }

  if (endDate <= startDate) {
    return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400, headers: corsHeaders });
  }

  const payload: AvailabilityInsert = {
    provider_id: userId,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    is_recurring: isRecurring,
    recurrence_rule: recurrenceRule,
    is_bookable: isBookable,
    updated_at: new Date().toISOString(),
  };

  const { data: insertData, error: insertError } = await supabaseClient
    .from('service_provider_availability')
    .insert(payload)
    .select('*')
    .single();

  const data = (insertData ?? null) as AvailabilityRow | null;

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create availability slot', details: insertError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json({ availability: data }, { status: 201, headers: corsHeaders });
}

