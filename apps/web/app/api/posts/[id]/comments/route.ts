/**
 * GET /api/posts/[id]/comments - Get comments for a post
 * POST /api/posts/[id]/comments - Add a comment to a post
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { notifyPostComment, notifyCommentReply } from '@/src/lib/post-notifications';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';

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
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('💬 Get Comments API called:', postId);

    // Authenticate user
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Load all comments for the post so we can build an unlimited-depth thread tree.
    const { data: allComments, error: commentsError } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      ;

    if (commentsError) {
      console.error('❌ Error fetching comments:', commentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch comments', details: commentsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!allComments || allComments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            comments: [],
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

    const topLevel = allComments.filter((c) => !c.parent_comment_id);
    const pagedTopLevel = topLevel.slice(offset, offset + limit);

    // Get user profiles
    const userIds = [...new Set(allComments.map((c) => c.user_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', userIds);

    // Get comment likes
    const allIds = allComments.map((c) => c.id);
    const { data: commentLikes } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', allIds);

    // Build maps
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p) => profileMap.set(p.id, p));
    }

    const likesMap = new Map();
    if (commentLikes) {
      commentLikes.forEach((like) => {
        if (!likesMap.has(like.comment_id)) {
          likesMap.set(like.comment_id, { count: 0, user_liked: false });
        }
        const likeData = likesMap.get(like.comment_id);
        likeData.count++;
        if (like.user_id === user.id) {
          likeData.user_liked = true;
        }
      });
    }

    const childrenMap = new Map<string, any[]>();
    allComments.forEach((c) => {
      if (!c.parent_comment_id) return;
      const arr = childrenMap.get(c.parent_comment_id) || [];
      arr.push(c);
      childrenMap.set(c.parent_comment_id, arr);
    });
    childrenMap.forEach((arr) => arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

    const buildCommentNode = (comment: any): any => {
      const profile = profileMap.get(comment.user_id);
      const likeData = likesMap.get(comment.id) || { count: 0, user_liked: false };
      const directChildren = (childrenMap.get(comment.id) || []).map((child) => buildCommentNode(child));

      const authorLike = {
        id: comment.user_id,
        name: profile?.display_name || profile?.username || 'User',
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || null,
        is_verified: profile?.is_verified || false,
      };

      return {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        parent_comment_id: comment.parent_comment_id || null,
        content: comment.content,
        image_url: (comment as any).image_url || null,
        user: {
          id: authorLike.id,
          display_name: profile?.display_name || profile?.username || 'User',
          username: authorLike.username,
          avatar_url: authorLike.avatar_url,
        },
        author: authorLike,
        created_at: comment.created_at,
        likes_count: likeData.count,
        like_count: likeData.count,
        user_liked: likeData.user_liked,
        replies_count: directChildren.length,
        replies: directChildren,
      };
    };
    const formattedComments = pagedTopLevel.map((comment) => buildCommentNode(comment));

    console.log(`✅ Fetched ${formattedComments.length} comments for post ${postId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          comments: formattedComments,
          pagination: {
            page,
            limit,
            total: topLevel.length,
            has_more: topLevel.length > offset + limit,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('💬 Add Comment API called:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    // Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if post exists and get author
    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        parent_comment_id: null, // Top-level comment
        content: content.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commentError) {
      console.error('❌ Error creating comment:', commentError);
      return NextResponse.json(
        { success: false, error: 'Failed to create comment', details: commentError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Send notification to post author (if not commenting on own post)
    if (post.user_id !== user.id) {
      const userName = profile?.display_name || profile?.username || 'Someone';
      const atLabel = profile?.username ? `@${profile.username}` : userName;
      const preview =
        content.trim().length > 100 ? `${content.trim().slice(0, 99)}…` : content.trim();
      notifyPostComment(post.user_id, userName, postId, comment.id).catch((err) => {
        console.error('Failed to send comment notification:', err);
      });
      const service = createServiceClient();
      sendExpoPushIfAllowed(service, post.user_id, 'comments_on_posts', {
        title: `${atLabel} commented on your post`,
        body: preview,
        data: { type: 'comment', postId, commentId: comment.id },
        channelId: 'social',
      }).catch((err) => console.error('Comment push:', err));
    }

    console.log('✅ Comment created successfully:', comment.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: {
            id: comment.id,
            post_id: comment.post_id,
            user_id: comment.user_id,
            content: comment.content,
            image_url: (comment as any).image_url || null,
            user: {
              id: user.id,
              display_name: profile?.display_name || profile?.username || 'Unknown',
              username: profile?.username,
              avatar_url: profile?.avatar_url,
            },
            author: {
              id: user.id,
              name: profile?.display_name || profile?.username || 'Unknown',
              username: profile?.username,
              avatar_url: profile?.avatar_url,
            },
            created_at: comment.created_at,
            likes_count: 0,
            like_count: 0,
            user_liked: false,
            replies_count: 0,
            replies: [],
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

