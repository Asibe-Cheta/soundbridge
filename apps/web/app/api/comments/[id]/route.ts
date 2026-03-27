/**
 * DELETE /api/comments/[id]
 * Allows deletion by:
 *  - comment author, or
 *  - parent post author
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: comment, error: commentErr } = await supabase
      .from('post_comments')
      .select('id, user_id, post_id, deleted_at')
      .eq('id', commentId)
      .single();

    if (commentErr || !comment || comment.deleted_at) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check whether current user is the post author
    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', comment.post_id)
      .single();

    const isCommentAuthor = comment.user_id === user.id;
    const isPostAuthor = !!post && post.user_id === user.id;

    if (!isCommentAuthor && !isPostAuthor) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Soft delete to keep auditability and compatibility with existing queries
    const { error: deleteErr } = await supabase
      .from('post_comments')
      .update({
        deleted_at: new Date().toISOString(),
        content: '[deleted]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (deleteErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete comment', details: deleteErr.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

