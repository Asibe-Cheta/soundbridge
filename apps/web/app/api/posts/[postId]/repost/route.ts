/**
 * POST /api/posts/[postId]/repost
 * 
 * Repost a post (with or without comment)
 * 
 * Request Body:
 * {
 *   "with_comment": true, // or false for quick repost
 *   "comment": "Optional comment text" // required if with_comment is true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "new-post-uuid",
 *     "content": "...",
 *     "reposted_from_id": "original-post-uuid",
 *     ...
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

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    console.log('🔄 Repost API called for post:', params.postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get the original post
    const { data: originalPost, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', params.postId)
      .is('deleted_at', null)
      .single();

    if (postError || !originalPost) {
      console.error('❌ Post not found:', postError);
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { with_comment = false, comment } = body;

    // Validate comment if required
    if (with_comment) {
      if (!comment || comment.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Comment is required when reposting with thoughts' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (comment.length > 500) {
        return NextResponse.json(
          { success: false, error: 'Comment must be 500 characters or less' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build the new post content
    let newPostContent = '';
    if (with_comment && comment) {
      // Repost with comment: user's comment
      newPostContent = comment.trim();
    } else {
      // Quick repost: empty content (just a repost)
      newPostContent = '';
    }

    // Create the repost
    // Note: reposted_from_id column may not exist in schema yet, so we'll try to include it
    // but it will be ignored if the column doesn't exist
    const postData: any = {
      user_id: user.id,
      content: newPostContent,
      visibility: originalPost.visibility, // Inherit visibility from original
      post_type: 'update', // Reposts are always 'update' type
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to add reposted_from_id if column exists (won't fail if it doesn't)
    try {
      // Check if column exists by attempting to query it
      const { error: checkError } = await supabase
        .from('posts')
        .select('reposted_from_id')
        .limit(0);
      
      // If no error, column exists, so include it
      if (!checkError) {
        postData.reposted_from_id = params.postId;
      }
    } catch {
      // Column doesn't exist, continue without it
    }

    const { data: newPost, error: createError } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating repost:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create repost', details: createError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Copy attachments from original post if any
    if (originalPost.media_urls && originalPost.media_urls.length > 0) {
      const { data: originalAttachments } = await supabase
        .from('post_attachments')
        .select('*')
        .eq('post_id', params.postId);

      if (originalAttachments && originalAttachments.length > 0) {
        const newAttachments = originalAttachments.map(att => ({
          post_id: newPost.id,
          file_url: att.file_url,
          file_name: att.file_name,
          attachment_type: att.attachment_type,
          file_size: att.file_size,
          duration: att.duration,
        }));

        await supabase
          .from('post_attachments')
          .insert(newAttachments);
      }
    }

    // Increment repost count on original post
    try {
      // Try using RPC function first
      await supabase.rpc('increment_post_shares', {
        post_id: params.postId,
      });
    } catch (error) {
      // Function might not exist, try manual update using SQL
      try {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ 
            shares_count: (originalPost.shares_count || 0) + 1 
          })
          .eq('id', params.postId);
        
        if (updateError) {
          console.warn('Could not increment shares_count:', updateError);
        }
      } catch (updateErr) {
        console.warn('Could not update shares_count:', updateErr);
        // Continue anyway - repost is created
      }
    }

    // Get author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline')
      .eq('id', user.id)
      .single();

    console.log('✅ Repost created successfully:', newPost.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newPost,
          author: {
            id: user.id,
            name: profile?.display_name || profile?.username || 'Unknown',
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            role: profile?.professional_headline,
          },
          reposted_from: {
            id: originalPost.id,
            content: originalPost.content,
            author: originalPost.user_id, // Will need to fetch separately if needed
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error creating repost:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

