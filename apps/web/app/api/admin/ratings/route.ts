import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const ratedUserId = searchParams.get('userId');
    const context = searchParams.get('context');
    const limitParam = Number(searchParams.get('limit') ?? 50);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
    const cursor = searchParams.get('cursor');

    const serviceClient = adminCheck.serviceClient;
    let query = serviceClient
      .from('creator_ratings')
      .select(`
        id,
        rating,
        comment,
        context,
        created_at,
        rated_user:profiles!creator_ratings_rated_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        rater:profiles!creator_ratings_rater_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (ratedUserId) {
      query = query.eq('rated_user_id', ratedUserId);
    }

    if (context) {
      query = query.eq('context', context);
    }

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

    return NextResponse.json({ data: ratings, nextCursor });
  } catch (error: any) {
    console.error('Admin ratings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
