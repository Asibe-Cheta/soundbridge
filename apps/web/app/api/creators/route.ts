import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { withQueryTimeout, logPerformance, createErrorResponse } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const supabase = createServiceClient();

    // Get query parameters
    const search = searchParams.get('search') || '';
    const genre = searchParams.get('genre') || '';
    const location = searchParams.get('location') || '';
    const sortBy = searchParams.get('sortBy') || 'followers';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const currentUserId = searchParams.get('currentUserId') || '';

    // OPTIMIZED: Simplified query without expensive count aggregations
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, location, country, followers_count, is_verified, role')
      .eq('role', 'creator' as any);

    // Apply search filter
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    // Apply genre filter (if profiles table has genre field)
    if (genre && genre !== 'all') {
      query = query.eq('genre', genre as any);
    }

    // Apply location filter
    if (location && location !== 'all') {
      query = query.ilike('location', `%${location}%` as any);
    }

    // Apply sorting (use followers_count column which already exists)
    switch (sortBy) {
      case 'followers':
        query = query.order('followers_count', { ascending: false, nullsFirst: false });
        break;
      case 'rating':
        query = query.order('followers_count', { ascending: false, nullsFirst: false });
        break;
      case 'tracks':
        query = query.order('followers_count', { ascending: false, nullsFirst: false });
        break;
      case 'name':
        query = query.order('display_name', { ascending: true });
        break;
      default:
        query = query.order('followers_count', { ascending: false, nullsFirst: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Add timeout protection
    const { data: creators, error } = await withQueryTimeout(query, 8000) as { data: any; error: any };

    if (error) {
      console.error('Error fetching creators:', error);
      logPerformance('/api/creators', startTime);

      return NextResponse.json(
        createErrorResponse('Failed to fetch creators', { data: [], pagination: { total: 0, limit, offset, hasMore: false } }),
        { status: 200 }
      );
    }

    // If we have a current user, check follow status (with timeout)
    let creatorsWithFollowStatus = creators || [];
    if (currentUserId && creators && creators.length > 0) {
      try {
        const creatorIds = creators.map((c: any) => c.id);

        const { data: follows } = await withQueryTimeout(
          supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUserId as any)
            .in('following_id', creatorIds as any),
          5000
        ) as { data: any; error: any };

        const followedIds = new Set(follows?.map((f: any) => f.following_id) || []);

        creatorsWithFollowStatus = creators.map((creator: any) => ({
          ...creator,
          isFollowing: followedIds.has(creator.id),
          tracks_count: 0 // Will be populated by UI if needed
        }));
      } catch (followError) {
        console.error('Error fetching follow status:', followError);
        // Continue without follow status
        creatorsWithFollowStatus = creators.map((creator: any) => ({
          ...creator,
          isFollowing: false,
          tracks_count: 0
        }));
      }
    } else {
      // Format creators without follow status
      creatorsWithFollowStatus = creators?.map((creator: any) => ({
        ...creator,
        isFollowing: false,
        tracks_count: 0
      })) || [];
    }

    // OPTIMIZED: Skip expensive count query, estimate from result
    const hasMore = creators && creators.length === limit;
    const estimatedTotal = hasMore ? offset + limit + 1 : offset + (creators?.length || 0);

    logPerformance('/api/creators', startTime);

    return NextResponse.json({
      data: creatorsWithFollowStatus,
      pagination: {
        total: estimatedTotal,
        limit,
        offset,
        hasMore
      }
    });

  } catch (error) {
    console.error('Unexpected error fetching creators:', error);
    logPerformance('/api/creators', startTime);

    return NextResponse.json(
      createErrorResponse('Internal server error', { data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } }),
      { status: 200 }
    );
  }
}
