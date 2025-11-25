/**
 * GET /api/posts/user/[userId]
 * 
 * Get all posts by a specific user
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Posts per page (default: 15, max: 50)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "posts": [...],
 *     "pagination": { page, limit, total, has_more }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    console.log('📰 Get User Posts API called:', userId);

    // Authenticate user (can view their own posts or public posts)
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const offset = (page - 1) * limit;

    // Check if viewing own posts or others
    const isOwnPosts = user.id === userId;

    // Build query
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // If viewing others' posts, filter by visibility
    if (!isOwnPosts) {
      query = query.or('visibility.eq.public,visibility.eq.connections');
    }

    query = query.order('created_at', { ascending: false });

    const { data: posts, error: postsError, count } = await query.range(offset, offset + limit - 1);

    if (postsError) {
      console.error('❌ Error fetching user posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts', details: postsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .eq('id', userId)
      .single();

    // Get attachments
    const postIds = posts.map(p => p.id);
    const { data: attachments } = await supabase
      .from('post_attachments')
      .select('*')
      .in('post_id', postIds);

    // Get reactions
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id, user_id, reaction_type')
      .in('post_id', postIds);

    // Get comment counts
    const { data: comments } = await supabase
      .from('post_comments')
      .select('post_id')
      .in('post_id', postIds)
      .is('deleted_at', null);

    // Build maps
    const attachmentsMap = new Map();
    if (attachments) {
      attachments.forEach(a => {
        if (!attachmentsMap.has(a.post_id)) {
          attachmentsMap.set(a.post_id, []);
        }
        attachmentsMap.get(a.post_id).push(a);
      });
    }

    const reactionsMap = new Map();
    if (reactions) {
      reactions.forEach(r => {
        if (!reactionsMap.has(r.post_id)) {
          reactionsMap.set(r.post_id, {
            support: 0,
            love: 0,
            fire: 0,
            congrats: 0,
            user_reaction: null,
          });
        }
        const reactionCounts = reactionsMap.get(r.post_id);
        reactionCounts[r.reaction_type]++;
        if (r.user_id === user.id) {
          reactionCounts.user_reaction = r.reaction_type;
        }
      });
    }

    const commentCountsMap = new Map();
    if (comments) {
      comments.forEach(c => {
        commentCountsMap.set(c.post_id, (commentCountsMap.get(c.post_id) || 0) + 1);
      });
    }

    // Format posts
    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      visibility: post.visibility,
      post_type: post.post_type,
      created_at: post.created_at,
      author: {
        id: post.user_id,
        name: profile?.display_name || profile?.username || 'Unknown',
        username: profile?.username,
        avatar_url: profile?.avatar_url,
        role: profile?.professional_headline,
      },
      attachments: attachmentsMap.get(post.id) || [],
      reactions: reactionsMap.get(post.id) || {
        support: 0,
        love: 0,
        fire: 0,
        congrats: 0,
        user_reaction: null,
      },
      comment_count: commentCountsMap.get(post.id) || 0,
    }));

    console.log(`✅ Fetched ${formattedPosts.length} posts for user ${userId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          posts: formattedPosts,
          pagination: {
            page,
            limit,
            total: count || 0,
            has_more: (count || 0) > offset + limit,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching user posts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

