/**
 * GET /api/posts/[id] - Get single post
 * DELETE /api/posts/[id] - Delete post (soft delete)
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
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('📄 Get Post API called:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .eq('id', post.user_id)
      .single();

    // Get attachments
    const { data: attachments } = await supabase
      .from('post_attachments')
      .select('*')
      .eq('post_id', post.id);

    // Get reactions
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('user_id, reaction_type')
      .eq('post_id', post.id);

    // Get comments (with replies)
    const { data: comments } = await supabase
      .from('post_comments')
      .select('*, user_id')
      .eq('post_id', post.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Format reactions
    const reactionCounts = {
      support: 0,
      love: 0,
      fire: 0,
      congrats: 0,
      user_reaction: null as string | null,
    };

    if (reactions) {
      reactions.forEach((r) => {
        reactionCounts[r.reaction_type]++;
        if (r.user_id === user.id) {
          reactionCounts.user_reaction = r.reaction_type;
        }
      });
    }

    // Format comments with author info
    const commentUserIds = comments ? [...new Set(comments.map((c) => c.user_id))] : [];
    const { data: commentProfiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', commentUserIds);

    const profileMap = new Map();
    if (commentProfiles) {
      commentProfiles.forEach((p) => profileMap.set(p.id, p));
    }

    const formattedComments = comments
      ? comments
          .filter((c) => !c.parent_comment_id) // Top-level comments only
          .map((comment) => {
            const commentProfile = profileMap.get(comment.user_id);
            const replies = comments.filter((c) => c.parent_comment_id === comment.id);

            return {
              ...comment,
              author: {
                id: comment.user_id,
                name: commentProfile?.display_name || commentProfile?.username || 'Unknown',
                username: commentProfile?.username,
                avatar_url: commentProfile?.avatar_url,
              },
              replies: replies.map((reply) => {
                const replyProfile = profileMap.get(reply.user_id);
                return {
                  ...reply,
                  author: {
                    id: reply.user_id,
                    name: replyProfile?.display_name || replyProfile?.username || 'Unknown',
                    username: replyProfile?.username,
                    avatar_url: replyProfile?.avatar_url,
                  },
                };
              }),
            };
          })
      : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          ...post,
          author: {
            id: post.user_id,
            name: profile?.display_name || profile?.username || 'Unknown',
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            role: profile?.professional_headline,
          },
          attachments: attachments || [],
          reactions: reactionCounts,
          comments: formattedComments,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Error fetching post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('✏️ Update Post API called:', postId);

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
    const { content, visibility, post_type } = body;

    // Check if post exists and belongs to user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id, content')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - you can only edit your own posts' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Validation
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) {
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Content cannot be empty' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (content.length > 500) {
        return NextResponse.json(
          { success: false, error: 'Content must be 500 characters or less' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.content = content.trim();
    }

    if (visibility !== undefined) {
      if (!['connections', 'public'].includes(visibility)) {
        return NextResponse.json(
          { success: false, error: 'Visibility must be "connections" or "public"' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.visibility = visibility;
    }

    if (post_type !== undefined) {
      if (!['update', 'opportunity', 'achievement', 'collaboration', 'event'].includes(post_type)) {
        return NextResponse.json(
          { success: false, error: 'Invalid post_type' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.post_type = post_type;
    }

    // Update post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating post:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update post', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Post updated successfully:', postId);

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .eq('id', updatedPost.user_id)
      .single();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...updatedPost,
          author: {
            id: updatedPost.user_id,
            name: profile?.display_name || profile?.username || 'Unknown',
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            role: profile?.professional_headline,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error updating post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('🗑️ Delete Post API called:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if post exists and belongs to user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - you can only delete your own posts' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId);

    if (deleteError) {
      console.error('❌ Error deleting post:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete post', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Post deleted successfully:', postId);

    return NextResponse.json(
      { success: true, message: 'Post deleted successfully' },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error deleting post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

