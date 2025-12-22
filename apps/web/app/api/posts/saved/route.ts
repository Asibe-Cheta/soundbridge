import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    // Get user's saved posts (bookmarks with content_type = 'post')
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('content_id, created_at')
      .eq('user_id', user.id)
      .eq('content_type', 'post')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return NextResponse.json(
        { error: 'Failed to fetch saved posts' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!bookmarks || bookmarks.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          has_more: false
        }
      }, { headers: corsHeaders });
    }

    // Get the actual post data for each bookmarked post
    const postIds = bookmarks.map(b => b.content_id);
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        user_id,
        visibility,
        post_type,
        event_id,
        created_at,
        updated_at,
        deleted_at
      `)
      .in('id', postIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch post details' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get author information for each post
    const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, role, location')
      .in('id', userIds);

    // Map authors to posts
    const authorsMap = new Map((authors || []).map(a => [a.id, a]));

    // Combine posts with bookmark metadata and author info
    const savedPosts = (posts || [])
      .map(post => ({
        ...post,
        author: authorsMap.get(post.user_id) || {
          id: post.user_id,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null,
          role: null,
          location: null
        },
        saved_at: bookmarks.find(b => b.content_id === post.id)?.created_at || null
      }))
      .sort((a, b) => {
        // Sort by saved_at (when user saved it), not post created_at
        const savedA = new Date(a.saved_at || 0).getTime();
        const savedB = new Date(b.saved_at || 0).getTime();
        return savedB - savedA;
      });

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('content_type', 'post');

    return NextResponse.json({
      success: true,
      data: savedPosts,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        has_more: offset + limit < (totalCount || 0)
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error getting saved posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

