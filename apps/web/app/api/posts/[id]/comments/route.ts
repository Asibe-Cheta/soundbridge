/**
 * GET /api/posts/[id]/comments - Top-level comments only (parent_comment_id IS NULL).
 *     Pass include_replies=true to embed nested reply threads (web feed UI).
 * POST /api/posts/[id]/comments - Add a top-level comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyPostComment } from '@/src/lib/post-notifications';
import {
  assertUserCanViewPost,
  fetchPostCommentsPage,
} from '@/src/lib/post-comments-api';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;
    const { user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
    const includeReplies = searchParams.get('include_replies') === 'true';

    const service = createServiceClient();
    const access = await assertUserCanViewPost(service, user.id, postId);
    if (access === 'not_found') {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders },
      );
    }
    if (access === 'forbidden') {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this post' },
        { status: 403, headers: corsHeaders },
      );
    }

    const { comments, pagination } = await fetchPostCommentsPage(service, {
      postId,
      viewerUserId: user.id,
      page,
      limit,
      includeReplies,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          comments,
          pagination,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error('❌ Unexpected error fetching comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await params;

    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        parent_comment_id: null,
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
        { status: 500, headers: corsHeaders },
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (post.user_id !== user.id) {
      const userName = profile?.display_name || profile?.username || 'Someone';
      const atLabel = profile?.username ? `@${profile.username}` : userName;
      const preview =
        content.trim().length > 100 ? `${content.trim().slice(0, 99)}…` : content.trim();
      try {
        await notifyPostComment(post.user_id, userName, postId, comment.id, {
          actorUserId: user.id,
          actorUsername: profile?.username ?? null,
          pushTitle: `${atLabel} commented on your post`,
          pushBody: preview,
        });
      } catch (err) {
        console.error('Failed to send comment notification:', err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: {
            id: comment.id,
            post_id: comment.post_id,
            user_id: comment.user_id,
            content: comment.content,
            image_url: (comment as { image_url?: string | null }).image_url || null,
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
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error('❌ Unexpected error creating comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
