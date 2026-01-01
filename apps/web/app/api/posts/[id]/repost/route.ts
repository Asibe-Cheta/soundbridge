/**
 * POST /api/posts/[id]/repost - Repost a post (with or without comment)
 * DELETE /api/posts/[id]/repost - Un-repost (remove repost)
 * 
 * POST Request Body:
 * {
 *   "with_comment": true, // or false for quick repost
 *   "comment": "Optional comment text" // required if with_comment is true
 * }
 * 
 * POST Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "new-post-uuid",
 *     "content": "...",
 *     "reposted_from_id": "original-post-uuid",
 *     "user_reposted": true,
 *     ...
 *   }
 * }
 * 
 * DELETE Response:
 * {
 *   "success": true,
 *   "data": {
 *     "repost_post_id": "uuid",
 *     "user_reposted": false,
 *     "message": "Repost removed successfully"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { notifyPostRepost } from '@/src/lib/post-notifications';

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
  const startTime = Date.now();
  
  try {
    console.log('🔄 Repost API called for post:', params.id);

    // Parse request body FIRST (before auth to catch parsing errors early)
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { with_comment = false, comment } = body;

    // Authenticate user with timeout
    const authPromise = getSupabaseRouteClient(request, true);
    const authTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication timeout')), 3000); // Reduced to 3s
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

    // Get ONLY the fields we need from original post (minimal query)
    const postQueryPromise = supabase
      .from('posts')
      .select('id, content, visibility, user_id')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single();

    const postQueryTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Post query timeout')), 5000); // Reduced to 5s
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

    // Note: Multiple reposts are now allowed (users can repost the same post multiple times)
    // Removed duplicate check to allow multiple reposts, matching standard social media behavior

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
    // Normal repost (without comment) should have null content
    // Repost with comment should have the user's comment as content
    const newPostContent = (with_comment && comment && comment.trim().length > 0) 
      ? comment.trim() 
      : null;

    // Create minimal post data - only required fields
    const postData: any = {
      user_id: user.id,
      content: newPostContent,
      visibility: originalPost.visibility,
      post_type: 'update',
    };

    // Try with reposted_from_id first (column should exist)
    postData.reposted_from_id = params.id;

    // Create the repost with SHORT timeout
    console.log('📝 Creating repost...');
    const createPostPromise = supabase
      .from('posts')
      .insert(postData)
      .select('id, content, user_id, created_at, reposted_from_id')
      .single();

    const createPostTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Create post timeout')), 5000); // Reduced to 5s
    });

    let { data: newPost, error: createError } = await Promise.race([
      createPostPromise,
      createPostTimeout
    ]) as any;

    // If error is about reposted_from_id, retry without it (one quick retry)
    if (createError && (createError.message?.includes('reposted_from_id') || createError.code === '42703')) {
      console.log('⚠️ reposted_from_id column not found, retrying without it');
      delete postData.reposted_from_id;
      
      const retryPromise = supabase
        .from('posts')
        .insert(postData)
        .select('id, content, user_id, created_at')
        .single();

      const retryTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Create post timeout')), 5000);
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

    console.log('✅ Repost created:', newPost.id, `(${Date.now() - startTime}ms)`);

    // Create repost record in post_reposts table
    const { error: repostRecordError } = await supabase
      .from('post_reposts')
      .insert({
        post_id: params.id,
        user_id: user.id,
        repost_post_id: newPost.id,
      });

    if (repostRecordError) {
      console.error('❌ Error creating repost record:', repostRecordError);
      // Don't fail the request - repost post is already created
      // But log the error for monitoring
    } else {
      console.log('✅ Repost record created in post_reposts table');
    }

    // Return IMMEDIATELY - do everything else in background
    const elapsed = Date.now() - startTime;
    console.log(`✅ Repost created successfully in ${elapsed}ms:`, newPost.id);

    // Do background operations (don't await)
    Promise.all([
      // Copy attachments (if any)
      originalPost.media_urls && originalPost.media_urls.length > 0
        ? supabase
            .from('post_attachments')
            .select('*')
            .eq('post_id', params.id)
            .then(({ data: originalAttachments }) => {
              if (originalAttachments?.length > 0) {
                const newAttachments = originalAttachments.map(att => ({
                  post_id: newPost.id,
                  file_url: att.file_url,
                  file_name: att.file_name,
                  attachment_type: att.attachment_type,
                  file_size: att.file_size,
                  duration: att.duration,
                }));
                return supabase.from('post_attachments').insert(newAttachments);
              }
            })
            .catch(() => {}) // Ignore errors
        : Promise.resolve(),
      
      // Increment shares count (fetch current value first, then update)
      supabase
        .from('posts')
        .select('shares_count')
        .eq('id', params.id)
        .single()
        .then(({ data }) => {
          if (data) {
            return supabase
              .from('posts')
              .update({ shares_count: (data.shares_count || 0) + 1 })
              .eq('id', params.id);
          }
        })
        .catch(() => {}) // Ignore errors
    ]).catch(() => {}); // Ignore all background errors

    // Send notification to original author (if not own post) - non-blocking
    if (originalPost.user_id !== user.id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      const userName = userProfile?.display_name || userProfile?.username || 'Someone';
      
      notifyPostRepost(
        originalPost.user_id,
        userName,
        originalPost.id,
        newPost.id
      ).catch((err) => {
        console.error('Failed to send repost notification:', err);
        // Don't fail the request if notification fails
      });
    }

    // Return minimal response immediately
    return NextResponse.json(
      {
        success: true,
        data: {
          id: newPost.id,
          content: newPost.content,
          user_id: newPost.user_id,
          created_at: newPost.created_at,
          reposted_from_id: newPost.reposted_from_id,
          user_reposted: true, // User has now reposted
          author: {
            id: user.id,
            name: user.email?.split('@')[0] || 'User',
            username: user.email?.split('@')[0] || 'user',
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

/**
 * DELETE /api/posts/[id]/repost
 * 
 * Remove a repost (un-repost)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    console.log('🗑️ Delete Repost API called for post:', postId);

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Find user's most recent repost record (LIFO - Last In First Out)
    // With multiple reposts allowed, we delete the most recent one
    const { data: repostRecord, error: findError } = await supabase
      .from('post_reposts')
      .select('id, repost_post_id, created_at')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !repostRecord) {
      return NextResponse.json(
        { success: false, error: 'Repost not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const repostPostId = repostRecord.repost_post_id;

    // Delete repost post (CASCADE will handle post_reposts deletion)
    const { error: deleteRepostError } = await supabase
      .from('posts')
      .delete()
      .eq('id', repostPostId)
      .eq('user_id', user.id); // Ensure user owns the repost

    if (deleteRepostError) {
      console.error('❌ Error deleting repost post:', deleteRepostError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete repost', details: deleteRepostError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Delete repost record explicitly (CASCADE should handle this, but explicit for safety)
    const { error: deleteRecordError } = await supabase
      .from('post_reposts')
      .delete()
      .eq('id', repostRecord.id);

    if (deleteRecordError) {
      console.error('⚠️ Error deleting repost record (non-critical):', deleteRecordError);
      // Don't fail - post is already deleted
    }

    // Decrement shares_count on original post (background operation)
    supabase
      .from('posts')
      .select('shares_count')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data && data.shares_count && data.shares_count > 0) {
          return supabase
            .from('posts')
            .update({ shares_count: Math.max(0, (data.shares_count || 0) - 1) })
            .eq('id', postId);
        }
      })
      .catch(() => {}); // Ignore errors in background operation

    console.log('✅ Repost deleted successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          repost_post_id: repostPostId,
          user_reposted: false, // User has now un-reposted
          message: 'Repost removed successfully',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error deleting repost:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

