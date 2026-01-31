/**
 * GET /api/posts/[id]/comments - Get comments for a post
 * POST /api/posts/[id]/comments - Add a comment to a post
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyPostComment, notifyCommentReply } from '@/src/lib/post-notifications';

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

    // Get comments (top-level only, no replies in this query)
    const { data: comments, error: commentsError, count } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      console.error('❌ Error fetching comments:', commentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch comments', details: commentsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            comments: [],
            pagination: {
              page,
              limit,
              total: count || 0,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get replies for each comment
    const commentIds = comments.map((c) => c.id);
    const { data: replies } = await supabase
      .from('post_comments')
      .select('*')
      .in('parent_comment_id', commentIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Get user profiles
    const userIds = [
      ...new Set([
        ...comments.map((c) => c.user_id),
        ...(replies ? replies.map((r) => r.user_id) : []),
      ]),
    ];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', userIds);

    // Get comment likes
    const { data: commentLikes } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', [...commentIds, ...(replies ? replies.map((r) => r.id) : [])]);

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

    // Format comments with replies
    const formattedComments = comments.map((comment) => {
      const profile = profileMap.get(comment.user_id);
      const likeData = likesMap.get(comment.id) || { count: 0, user_liked: false };
      const commentReplies = replies
        ? replies
            .filter((r) => r.parent_comment_id === comment.id)
            .map((reply) => {
              const replyProfile = profileMap.get(reply.user_id);
              const replyLikeData = likesMap.get(reply.id) || { count: 0, user_liked: false };
              return {
                id: reply.id,
                content: reply.content,
                author: {
                  id: reply.user_id,
                  name: replyProfile?.display_name || replyProfile?.username || 'User',
                  username: replyProfile?.username || null,
                  avatar_url: replyProfile?.avatar_url || null,
                  is_verified: replyProfile?.is_verified || false,
                },
                created_at: reply.created_at,
                like_count: replyLikeData.count,
                user_liked: replyLikeData.user_liked,
              };
            })
        : [];

      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.user_id,
          name: profile?.display_name || profile?.username || 'User',
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          is_verified: profile?.is_verified || false,
        },
        created_at: comment.created_at,
        like_count: likeData.count,
        user_liked: likeData.user_liked,
        replies: commentReplies,
      };
    });

    console.log(`✅ Fetched ${formattedComments.length} comments for post ${postId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          comments: formattedComments,
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
      notifyPostComment(post.user_id, userName, postId, comment.id).catch((err) => {
        console.error('Failed to send comment notification:', err);
        // Don't fail the request if notification fails
      });
    }

    console.log('✅ Comment created successfully:', comment.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: {
            id: comment.id,
            content: comment.content,
            author: {
              id: user.id,
              name: profile?.display_name || profile?.username || 'Unknown',
              username: profile?.username,
              avatar_url: profile?.avatar_url,
            },
            created_at: comment.created_at,
            like_count: 0,
            user_liked: false,
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

