import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function GET(_request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const ratedUserId = params.userId;
    const serviceClient = createServerClient();

    const { data, error } = await serviceClient
      .from('profiles')
      .select('id, rating_avg, rating_count')
      .eq('id', ratedUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching rating summary:', error);
      return NextResponse.json({ error: 'Failed to fetch rating summary' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      average: Number(data.rating_avg ?? 0),
      count: Number(data.rating_count ?? 0),
    });
  } catch (error: any) {
    console.error('Unexpected rating summary error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
