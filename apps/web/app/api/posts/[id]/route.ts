/**
 * GET /api/posts/[id] - Get single post
 * DELETE /api/posts/[id] - Delete post (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

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
      .select('id, username, display_name, avatar_url, professional_headline, bio, is_verified')
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
      .select('id, username, display_name, avatar_url, is_verified')
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
                name: commentProfile?.display_name || commentProfile?.username || 'User',
                username: commentProfile?.username || null,
                avatar_url: commentProfile?.avatar_url || null,
                is_verified: commentProfile?.is_verified || false,
              },
              replies: replies.map((reply) => {
                const replyProfile = profileMap.get(reply.user_id);
                return {
                  ...reply,
                  author: {
                    id: reply.user_id,
                    name: replyProfile?.display_name || replyProfile?.username || 'User',
                    username: replyProfile?.username || null,
                    avatar_url: replyProfile?.avatar_url || null,
                    is_verified: replyProfile?.is_verified || false,
                  },
                };
              }),
            };
          })
      : [];

    // Check if user has reposted this post
    const { data: userRepost } = await supabase
      .from('post_reposts')
      .select('repost_post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch original post data if this is a repost
    let repostedFromData = null;
    if (post.reposted_from_id) {
      try {
        // Fetch original post
        const { data: originalPost } = await supabase
          .from('posts')
          .select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at')
          .eq('id', post.reposted_from_id)
          .is('deleted_at', null)
          .single();

        if (originalPost) {
          // Get original post author
          const { data: originalAuthor } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, professional_headline, bio, is_verified')
            .eq('id', originalPost.user_id)
            .single();

          // Get original post attachments
          const { data: originalAttachments } = await supabase
            .from('post_attachments')
            .select('*')
            .eq('post_id', originalPost.id);

          // Get original post reactions
          const { data: originalReactions } = await supabase
            .from('post_reactions')
            .select('post_id, reaction_type')
            .eq('post_id', originalPost.id);

          // Calculate reaction counts
          const originalReactionCounts = {
            support: 0,
            love: 0,
            fire: 0,
            congrats: 0,
          };
          if (originalReactions) {
            originalReactions.forEach((r) => {
              if (r.reaction_type in originalReactionCounts) {
                originalReactionCounts[r.reaction_type as keyof typeof originalReactionCounts]++;
              }
            });
          }

          // Extract primary image/audio from attachments
          const imageAttachment = originalAttachments?.find((a) => 
            a.attachment_type === 'image' || a.attachment_type === 'photo'
          );
          const audioAttachment = originalAttachments?.find((a) => 
            a.attachment_type === 'audio' || a.attachment_type === 'track'
          );

          repostedFromData = {
            id: originalPost.id,
            content: originalPost.content,
            created_at: originalPost.created_at,
            visibility: originalPost.visibility,
            author: originalAuthor ? {
              id: originalAuthor.id,
              username: originalAuthor.username || '',
              display_name: originalAuthor.display_name || originalAuthor.username || 'User',
              avatar_url: originalAuthor.avatar_url || null,
              headline: originalAuthor.professional_headline || null,
              bio: originalAuthor.bio || null,
              is_verified: originalAuthor.is_verified || false,
            } : {
              id: originalPost.user_id,
              username: '',
              display_name: 'User',
              avatar_url: null,
              headline: null,
              bio: null,
              is_verified: false,
            },
            media_urls: originalPost.media_urls || [],
            image_url: imageAttachment?.file_url || null,
            audio_url: audioAttachment?.file_url || null,
            attachments: originalAttachments || [],
            reactions_count: originalReactionCounts,
            comments_count: originalPost.comments_count || 0,
            shares_count: originalPost.shares_count || 0,
          };
        }
      } catch (repostError) {
        console.warn('⚠️ Failed to fetch reposted_from data:', repostError);
        // Continue without reposted_from data
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...post,
          user_reposted: !!userRepost,
          user_repost_id: userRepost?.repost_post_id || null,
          author: {
            id: post.user_id,
            name: profile?.display_name || profile?.username || 'Unknown',
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            role: profile?.professional_headline,
            headline: profile?.professional_headline || null,
            bio: profile?.bio || null,
            is_verified: profile?.is_verified || false,
          },
          attachments: attachments || [],
          reactions: reactionCounts,
          comments: formattedComments,
          reposted_from: repostedFromData,
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
      const trimmed = typeof content === 'string' ? content.trim() : '';
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: 'Content cannot be empty' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (content.length > 3000) {
        return NextResponse.json(
          { success: false, error: 'Content must be 3,000 characters or less' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.content = trimmed;
    }

    const { image_urls: imageUrls } = body;
    if (imageUrls !== undefined) {
      if (!Array.isArray(imageUrls)) {
        return NextResponse.json(
          { success: false, error: 'image_urls must be an array' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.image_urls = imageUrls.slice(0, 20);
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
      .select('id, username, display_name, avatar_url, professional_headline, is_verified')
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
            is_verified: profile?.is_verified || false,
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

    // Soft delete using service client to bypass RLS
    // We've already verified the user owns the post, so this is safe
    // This avoids RLS policy issues with UPDATE operations
    const supabaseService = createServiceClient();
    const { error: deleteError } = await supabaseService
      .from('posts')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('user_id', user.id); // Extra safety check

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

