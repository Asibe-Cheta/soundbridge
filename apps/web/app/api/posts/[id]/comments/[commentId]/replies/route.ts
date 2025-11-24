/**
 * POST /api/posts/[id]/comments/[commentId]/replies
 * 
 * Reply to a comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyCommentReply } from '@/src/lib/post-notifications';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const postId = params.id;
    const commentId = params.commentId;
    console.log('💬 Add Reply API called:', { postId, commentId });

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

    // Verify parent comment exists and belongs to the post, get author
    const { data: parentComment } = await supabase
      .from('post_comments')
      .select('id, post_id, user_id')
      .eq('id', commentId)
      .eq('post_id', postId)
      .is('deleted_at', null)
      .single();

    if (!parentComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create reply
    const { data: reply, error: replyError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        parent_comment_id: commentId,
        content: content.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (replyError) {
      console.error('❌ Error creating reply:', replyError);
      return NextResponse.json(
        { success: false, error: 'Failed to create reply', details: replyError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Send notification to comment author (if not replying to own comment)
    if (parentComment.user_id !== user.id) {
      const userName = profile?.display_name || profile?.username || 'Someone';
      notifyCommentReply(parentComment.user_id, userName, postId, commentId, reply.id).catch((err) => {
        console.error('Failed to send reply notification:', err);
        // Don't fail the request if notification fails
      });
    }

    console.log('✅ Reply created successfully:', reply.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          reply: {
            id: reply.id,
            content: reply.content,
            author: {
              id: user.id,
              name: profile?.display_name || profile?.username || 'Unknown',
              username: profile?.username,
              avatar_url: profile?.avatar_url,
            },
            created_at: reply.created_at,
            like_count: 0,
            user_liked: false,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error creating reply:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

