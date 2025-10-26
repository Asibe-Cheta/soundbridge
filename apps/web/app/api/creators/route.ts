import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
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

    // Build the query
    let query = supabase
      .from('profiles')
      .select(`
        *,
        followers:follows!follows_following_id_fkey(count),
        tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
        events:events!events_creator_id_fkey(count)
      `)
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

    // Apply sorting
    switch (sortBy) {
      case 'followers':
        query = query.order('created_at', { ascending: false }); // Fallback to created_at
        break;
      case 'rating':
        query = query.order('created_at', { ascending: false }); // Fallback to created_at
        break;
      case 'tracks':
        query = query.order('created_at', { ascending: false }); // Fallback to created_at
        break;
      case 'name':
        query = query.order('display_name', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: creators, error } = await query as { data: any; error: any };

    if (error) {
      console.error('Error fetching creators:', error);
      return NextResponse.json({
        error: 'Failed to fetch creators',
        details: error.message
      }, { status: 500 });
    }

    // If we have a current user, check follow status
    let creatorsWithFollowStatus = creators || [];
    if (currentUserId && creators && creators.length > 0) {
      const creatorIds = creators.map((c: any) => c.id);
      
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId as any)
        .in('following_id', creatorIds as any) as { data: any; error: any };

      const followedIds = new Set(follows?.map((f: any) => f.following_id) || []);
      
      creatorsWithFollowStatus = creators.map((creator: any) => ({
        ...creator,
        isFollowing: followedIds.has(creator.id),
        followers_count: creator.followers?.[0]?.count || 0,
        tracks_count: creator.tracks?.[0]?.count || 0,
        events_count: creator.events?.[0]?.count || 0
      }));
    } else {
      // Format creators without follow status
      creatorsWithFollowStatus = creators?.map((creator: any) => ({
        ...creator,
        isFollowing: false,
        followers_count: creator.followers?.[0]?.count || 0,
        tracks_count: creator.tracks?.[0]?.count || 0,
        events_count: creator.events?.[0]?.count || 0
      })) || [];
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'creator' as any);

    if (search) {
      countQuery = countQuery.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    if (genre && genre !== 'all') {
      countQuery = countQuery.eq('genre', genre as any);
    }

    if (location && location !== 'all') {
      countQuery = countQuery.ilike('location', `%${location}%` as any);
    }

    const { count } = await countQuery as { count: any; error: any };

    return NextResponse.json({
      data: creatorsWithFollowStatus,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('Unexpected error fetching creators:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
