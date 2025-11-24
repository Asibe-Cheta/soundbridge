/**
 * POST /api/comments/[id]/like - Like or unlike a comment
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    console.log('👍 Like Comment API called:', commentId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if comment exists
    const { data: comment } = await supabase
      .from('post_comments')
      .select('id')
      .eq('id', commentId)
      .is('deleted_at', null)
      .single();

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user already liked
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Unlike (remove like)
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('❌ Error removing like:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to remove like', details: deleteError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      // Get updated count
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      return NextResponse.json(
        {
          success: true,
          data: {
            liked: false,
            like_count: count || 0,
          },
        },
        { headers: corsHeaders }
      );
    } else {
      // Like (add like)
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('❌ Error adding like:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to add like', details: insertError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      // Get updated count
      const { count } = await supabase
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);

      return NextResponse.json(
        {
          success: true,
          data: {
            liked: true,
            like_count: count || 0,
          },
        },
        { headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('❌ Unexpected error handling comment like:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

