import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';
import type { CreateAvailabilityData } from '@/src/lib/types/availability';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createApiClientWithCookies();
    
    const creatorId = searchParams.get('creatorId');
    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    const { data: availability, error } = await supabase
      .from('creator_availability')
      .select('*')
      .eq('creator_id', creatorId as any)
      .gte('end_date', new Date().toISOString())
      .order('start_date', { ascending: true }) as { data: any; error: any };

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    // Transform the data to match AvailabilitySlot interface
    const transformedAvailability = availability?.map((slot: any) => ({
      id: slot.id,
      start_date: slot.start_date,
      end_date: slot.end_date,
      is_available: slot.is_available,
      request_count: 0, // TODO: Get from collaboration_requests table
      max_requests: slot.max_requests_per_slot,
      notes: slot.notes
    })) || [];

    return NextResponse.json({ data: transformedAvailability });
  } catch (error) {
    console.error('Unexpected error fetching availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body: CreateAvailabilityData = await request.json();
    
    if (!body.start_date || !body.end_date) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const { data: availability, error } = await (supabase
      .from('creator_availability') as any)
      .insert({
        creator_id: user.id,
        start_date: body.start_date,
        end_date: body.end_date,
        is_available: body.is_available ?? true,
        max_requests_per_slot: body.max_requests_per_slot || 1,
        notes: body.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating availability:', error);
      return NextResponse.json({ error: 'Failed to create availability slot' }, { status: 500 });
    }

    return NextResponse.json({ data: availability });
  } catch (error) {
    console.error('Unexpected error creating availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
