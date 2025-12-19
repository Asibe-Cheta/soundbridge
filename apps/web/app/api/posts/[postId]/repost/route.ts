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
  const startTime = Date.now();
  
  try {
    console.log('🔄 Repost API called for post:', params.postId);

    // Authenticate user with timeout
    const authPromise = getSupabaseRouteClient(request, true);
    const authTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication timeout')), 5000);
    });

    const { supabase, user, error: authError } = await Promise.race([
      authPromise,
      authTimeoutPromise
    ]) as any;

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id, `(${Date.now() - startTime}ms)`);

    // Parse request body FIRST (before any DB queries)
    let body: any;
    try {
      console.log('📥 Parsing request body...');
      body = await request.json();
      console.log('✅ Request body parsed:', { with_comment: body.with_comment, commentLength: body.comment?.length || 0 });
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { with_comment = false, comment } = body;

    // Get the original post with timeout
    console.log('🔍 Fetching original post...');
    const postQueryPromise = supabase
      .from('posts')
      .select('*')
      .eq('id', params.postId)
      .is('deleted_at', null)
      .single();

    const postQueryTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Post query timeout')), 8000);
    });

    const { data: originalPost, error: postError } = await Promise.race([
      postQueryPromise,
      postQueryTimeout
    ]) as any;

    if (postError || !originalPost) {
      console.error('❌ Post not found:', postError);
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('✅ Original post fetched:', originalPost.id, `(${Date.now() - startTime}ms)`);

    // Validate comment if required
    if (with_comment) {
      if (!comment || (typeof comment === 'string' && comment.trim().length === 0)) {
        console.error('❌ Comment validation failed: comment is required when with_comment is true');
        return NextResponse.json(
          { success: false, error: 'Comment is required when reposting with thoughts' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (typeof comment === 'string' && comment.length > 500) {
        console.error('❌ Comment validation failed: comment exceeds 500 characters');
        return NextResponse.json(
          { success: false, error: 'Comment must be 500 characters or less' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build the new post content
    let newPostContent = '';
    if (with_comment && comment && comment.trim().length > 0) {
      // Repost with comment: user's comment
      newPostContent = comment.trim();
    } else {
      // Quick repost: use original post content (required - content cannot be empty)
      newPostContent = originalPost.content || 'Reposted';
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

    // Try to add reposted_from_id if column exists
    // If column doesn't exist, we'll retry without it
    postData.reposted_from_id = params.postId;

    // Create the repost with timeout
    console.log('📝 Creating repost...');
    const createPostPromise = supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    const createPostTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Create post timeout')), 8000);
    });

    let { data: newPost, error: createError } = await Promise.race([
      createPostPromise,
      createPostTimeout
    ]) as any;

    console.log('📝 Create post result:', { hasPost: !!newPost, hasError: !!createError, elapsed: `${Date.now() - startTime}ms` });

    // If error is about reposted_from_id column not existing, retry without it
    if (createError && (createError.message?.includes('reposted_from_id') || createError.code === '42703')) {
      console.log('⚠️ reposted_from_id column not found, retrying without it');
      delete postData.reposted_from_id;
      
      const retryPromise = supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      const retryTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Create post timeout')), 8000);
      });

      const retryResult = await Promise.race([
        retryPromise,
        retryTimeout
      ]) as any;

      newPost = retryResult.data;
      createError = retryResult.error;
    }

    if (createError || !newPost) {
      console.error('❌ Error creating repost:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create repost', details: createError?.message || 'Unknown error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Copy attachments from original post if any (non-blocking)
    if (originalPost.media_urls && originalPost.media_urls.length > 0) {
      // Don't await - do this in background to speed up response
      supabase
        .from('post_attachments')
        .select('*')
        .eq('post_id', params.postId)
        .then(({ data: originalAttachments }) => {
          if (originalAttachments && originalAttachments.length > 0) {
            const newAttachments = originalAttachments.map(att => ({
              post_id: newPost.id,
              file_url: att.file_url,
              file_name: att.file_name,
              attachment_type: att.attachment_type,
              file_size: att.file_size,
              duration: att.duration,
            }));

            supabase.from('post_attachments').insert(newAttachments).catch(err => {
              console.warn('Could not copy attachments:', err);
            });
          }
        })
        .catch(err => {
          console.warn('Could not fetch attachments:', err);
        });
    }

    // Increment repost count on original post (non-blocking)
    supabase
      .from('posts')
      .update({ 
        shares_count: (originalPost.shares_count || 0) + 1 
      })
      .eq('id', params.postId)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.warn('Could not increment shares_count:', updateError);
        }
      })
      .catch(err => {
        console.warn('Could not update shares_count:', err);
      });

    // Skip profile query entirely for now - use minimal author data
    // Profile can be fetched client-side if needed
    const elapsed = Date.now() - startTime;
    console.log(`✅ Repost created successfully in ${elapsed}ms:`, newPost.id);

    // Return immediately with minimal data - don't wait for profile
    return NextResponse.json(
      {
        success: true,
        data: {
          ...newPost,
          author: {
            id: user.id,
            name: user.email?.split('@')[0] || 'User',
            username: user.email?.split('@')[0] || 'user',
            avatar_url: null,
            role: null,
          },
          reposted_from: {
            id: originalPost.id,
            content: originalPost.content,
            author: originalPost.user_id,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Unexpected error creating repost (after ${elapsed}ms):`, error);
    
    // Check if it was a timeout
    if (error.message?.includes('timeout') || error.message?.includes('aborted') || error.message?.includes('Operation timeout')) {
      return NextResponse.json(
        { success: false, error: 'Request timed out. Please try again.' },
        { status: 504, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

