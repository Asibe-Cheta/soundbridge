import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';
import type { CreateAvailabilityData } from '@/src/lib/types/availability';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createApiClientWithCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body: Partial<CreateAvailabilityData> = await request.json();
    const resolvedParams = await params;
    const availabilityId = resolvedParams.id;

    const { data: availability, error } = await (supabase
      .from('creator_availability') as any)
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', availabilityId)
      .eq('creator_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating availability:', error);
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
    }

    return NextResponse.json({ data: availability });
  } catch (error) {
    console.error('Unexpected error updating availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createApiClientWithCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const availabilityId = resolvedParams.id;

    const { error } = await (supabase
      .from('creator_availability') as any)
      .delete()
      .eq('id', availabilityId)
      .eq('creator_id', user.id);

    if (error) {
      console.error('Error deleting availability:', error);
      return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
