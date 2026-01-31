import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const ratedUserId = params.userId;
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') ?? 20);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;
    const cursor = searchParams.get('cursor');

    const serviceClient = createServerClient();
    let query = serviceClient
      .from('creator_ratings')
      .select('rating, comment, context, created_at')
      .eq('rated_user_id', ratedUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    const ratings = data || [];
    const nextCursor = ratings.length === limit ? ratings[ratings.length - 1].created_at : null;

    return NextResponse.json({
      data: ratings.map((rating) => ({
        rating: rating.rating,
        comment: rating.comment,
        context: rating.context,
        created_at: rating.created_at,
      })),
      nextCursor,
    });
  } catch (error: any) {
    console.error('Unexpected ratings list error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
