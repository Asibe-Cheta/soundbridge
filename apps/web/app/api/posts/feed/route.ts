/**
 * OPTIMIZED GET /api/posts/feed
 *
 * Blazing fast feed endpoint with:
 * - Single optimized query
 * - Request timeout protection
 * - Minimal joins
 * - Simple sorting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { withAuthTimeout, withQueryTimeout, logPerformance, createErrorResponse } from '@/lib/api-helpers';

// CRITICAL: Force dynamic rendering to prevent Vercel edge caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('📰 Optimized Feed API called');

    // Authenticate user with timeout using helper
    const { supabase, user, error: authError } = await withAuthTimeout(
      getSupabaseRouteClient(request, true),
      5000
    );

    if (authError || !user) {
      console.error('❌ Authentication failed');
      logPerformance('/api/posts/feed', startTime);
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          data: { posts: [], pagination: { page: 1, limit: 15, total: 0, has_more: false } }
        },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Verify Supabase client has correct user context for RLS
    const { data: userCheck, error: userCheckError } = await supabase.auth.getUser();
    if (userCheckError || !userCheck?.user || userCheck.user.id !== user.id) {
      console.error('⚠️ Supabase client user context mismatch:', {
        expectedUserId: user.id,
        actualUserId: userCheck?.user?.id || null,
        error: userCheckError?.message || null,
      });
    } else {
      console.log('✅ Supabase client user context verified:', userCheck.user.id);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const postType = searchParams.get('type');
    const offset = (page - 1) * limit;

    // EMERGENCY OPTIMIZATION: Minimal query without JOIN
    // Reduce limit to speed up query
    const safeLimit = Math.min(limit, 20); // Cap at 20 for performance

    // FIXED: Let RLS policy handle visibility (public + connections)
    // The RLS policy automatically filters based on:
    // 1. Public posts (everyone can see)
    // 2. Connection posts (only connections can see)
    // 3. User's own posts (always visible)
    let query = supabase
      .from('posts')
      .select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at, updated_at, reposted_from_id')
      .is('deleted_at', null)
      // Removed: .eq('visibility', 'public') - RLS handles this now
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    // Filter by post type if provided
    if (postType) {
      query = query.eq('post_type', postType);
    }

    console.log('🔍 Executing minimal query (no JOIN)...');
    console.log('📋 Query params:', { page, limit: safeLimit, offset, postType, userId: user.id });

    // Execute with increased timeout to match client 30s timeout
    const { data: posts, error: postsError } = await withQueryTimeout(query, 20000) as any;

    // Enhanced logging for debugging
    console.log('📊 Query result:', {
      postsCount: posts?.length || 0,
      hasError: !!postsError,
      errorMessage: postsError?.message || null,
      errorCode: postsError?.code || null,
      errorDetails: postsError?.details || null,
    });

    // If we got posts, fetch authors and repost status separately (faster than JOIN)
    if (posts && posts.length > 0) {
      const userIds = [...new Set(posts.map((p: any) => p.user_id))];
      const postIds = posts.map((p: any) => p.id);

      try {
        // Fetch authors
        const { data: authors } = await withQueryTimeout(
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, role, location')
            .in('id', userIds),
          10000 // 10s timeout for author lookup
        ) as any;

        // Map authors to posts
        if (authors) {
          const authorsMap = new Map(authors.map((a: any) => [a.id, a]));
          posts.forEach((post: any) => {
            post.author = authorsMap.get(post.user_id) || null;
          });
        }

        // Fetch user's reposts to determine user_reposted status
        const { data: userReposts } = await withQueryTimeout(
          supabase
            .from('post_reposts')
            .select('post_id, repost_post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds),
          5000 // 5s timeout for repost lookup
        ) as any;

        // Create map of post_id -> repost_post_id for quick lookup
        const repostsMap = new Map();
        if (userReposts) {
          userReposts.forEach((r: any) => {
            repostsMap.set(r.post_id, r.repost_post_id);
          });
        }

        // Add user_reposted and user_repost_id to each post
        posts.forEach((post: any) => {
          const repostPostId = repostsMap.get(post.id);
          post.user_reposted = !!repostPostId;
          post.user_repost_id = repostPostId || null;
        });

        // Fetch original posts for reposts (reposted_from object)
        const repostedFromIds = posts
          .map((p: any) => p.reposted_from_id)
          .filter((id: any) => id !== null && id !== undefined);
        
        if (repostedFromIds.length > 0) {
          try {
            // Fetch original posts
            const { data: originalPosts } = await withQueryTimeout(
              supabase
                .from('posts')
                .select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at')
                .in('id', repostedFromIds)
                .is('deleted_at', null),
              10000 // 10s timeout
            ) as any;

            if (originalPosts && originalPosts.length > 0) {
              // Get original post authors
              const originalAuthorIds = [...new Set(originalPosts.map((p: any) => p.user_id))];
              const { data: originalAuthors } = await withQueryTimeout(
                supabase
                  .from('profiles')
                  .select('id, username, display_name, avatar_url')
                  .in('id', originalAuthorIds),
                5000 // 5s timeout
              ) as any;

              // Get original post attachments
              const originalPostIds = originalPosts.map((p: any) => p.id);
              const { data: originalAttachments } = await withQueryTimeout(
                supabase
                  .from('post_attachments')
                  .select('*')
                  .in('post_id', originalPostIds),
                5000 // 5s timeout
              ) as any;

              // Get original post reactions
              const { data: originalReactions } = await withQueryTimeout(
                supabase
                  .from('post_reactions')
                  .select('post_id, reaction_type')
                  .in('post_id', originalPostIds),
                5000 // 5s timeout
              ) as any;

              // Build maps for quick lookup
              const originalPostsMap = new Map(originalPosts.map((p: any) => [p.id, p]));
              const originalAuthorsMap = new Map((originalAuthors || []).map((a: any) => [a.id, a]));
              
              // Group attachments by post_id
              const originalAttachmentsMap = new Map();
              (originalAttachments || []).forEach((att: any) => {
                if (!originalAttachmentsMap.has(att.post_id)) {
                  originalAttachmentsMap.set(att.post_id, []);
                }
                originalAttachmentsMap.get(att.post_id).push(att);
              });

              // Calculate reaction counts for original posts
              const originalReactionsMap = new Map();
              originalPostIds.forEach((postId: string) => {
                originalReactionsMap.set(postId, {
                  support: 0,
                  love: 0,
                  fire: 0,
                  congrats: 0,
                });
              });
              
              if (originalReactions) {
                originalReactions.forEach((r: any) => {
                  const counts = originalReactionsMap.get(r.post_id);
                  if (counts && r.reaction_type in counts) {
                    counts[r.reaction_type]++;
                  }
                });
              }

              // Map reposted_from object to each repost
              posts.forEach((post: any) => {
                if (post.reposted_from_id) {
                  const originalPost = originalPostsMap.get(post.reposted_from_id);
                  if (originalPost) {
                    const originalAuthor = originalAuthorsMap.get(originalPost.user_id);
                    const attachments = originalAttachmentsMap.get(originalPost.id) || [];
                    const reactionsCount = originalReactionsMap.get(originalPost.id) || {
                      support: 0,
                      love: 0,
                      fire: 0,
                      congrats: 0,
                    };

                    // Extract primary image/audio from attachments
                    const imageAttachment = attachments.find((a: any) => 
                      a.attachment_type === 'image' || a.attachment_type === 'photo'
                    );
                    const audioAttachment = attachments.find((a: any) => 
                      a.attachment_type === 'audio' || a.attachment_type === 'track'
                    );

                    post.reposted_from = {
                      id: originalPost.id,
                      content: originalPost.content,
                      created_at: originalPost.created_at,
                      visibility: originalPost.visibility,
                      author: originalAuthor ? {
                        id: originalAuthor.id,
                        username: originalAuthor.username || '',
                        display_name: originalAuthor.display_name || originalAuthor.username || 'User',
                        avatar_url: originalAuthor.avatar_url || null,
                      } : {
                        id: originalPost.user_id,
                        username: '',
                        display_name: 'User',
                        avatar_url: null,
                      },
                      media_urls: originalPost.media_urls || [],
                      image_url: imageAttachment?.file_url || null,
                      audio_url: audioAttachment?.file_url || null,
                      attachments: attachments,
                      reactions_count: reactionsCount,
                      comments_count: originalPost.comments_count || 0,
                      shares_count: originalPost.shares_count || 0,
                    };
                  } else {
                    // Original post not found (deleted or inaccessible)
                    post.reposted_from = null;
                  }
                } else {
                  // Not a repost
                  post.reposted_from = null;
                }
              });
            } else {
              // No original posts found - set reposted_from to null
              posts.forEach((post: any) => {
                if (post.reposted_from_id) {
                  post.reposted_from = null;
                } else {
                  post.reposted_from = null;
                }
              });
            }
          } catch (repostError) {
            console.warn('⚠️ Failed to fetch reposted_from data, continuing without:', repostError);
            // Set reposted_from to null for all posts if fetch fails
            posts.forEach((post: any) => {
              post.reposted_from = null;
            });
          }
        } else {
          // No reposts in this batch - set reposted_from to null for all
          posts.forEach((post: any) => {
            post.reposted_from = null;
          });
        }
      } catch (fetchError) {
        console.warn('⚠️ Failed to fetch authors/reposts, continuing without:', fetchError);
        // Continue without authors/reposts - posts will have null author and user_reposted = false
        posts.forEach((post: any) => {
          post.user_reposted = false;
          post.user_repost_id = null;
          post.reposted_from = null;
        });
      }
    }

    logPerformance('/api/posts/feed (query)', startTime);

    if (postsError) {
      console.error('❌ Error fetching posts:', {
        message: postsError.message,
        code: postsError.code,
        details: postsError.details,
        hint: postsError.hint,
        userId: user.id,
      });
      logPerformance('/api/posts/feed', startTime);
      return NextResponse.json(
        createErrorResponse('Failed to load posts', {
          posts: [],
          pagination: { page, limit, total: 0, has_more: false }
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(`📊 Found ${posts?.length || 0} posts`);
    
    // Additional debug: Log first post if available
    if (posts && posts.length > 0) {
      console.log('✅ Sample post:', {
        id: posts[0].id,
        userId: posts[0].user_id,
        visibility: posts[0].visibility,
        contentPreview: posts[0].content?.substring(0, 50) || 'N/A',
      });
    } else {
      console.warn('⚠️ No posts returned - checking RLS policy...');
      // Try a direct count query to verify RLS
      const { count, error: countError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('visibility', 'public');
      
      console.log('🔍 RLS Check - Public posts count:', {
        count,
        countError: countError?.message || null,
        userId: user.id,
      });
    }

    // Estimate pagination without expensive count
    const hasMore = posts && posts.length === safeLimit;
    const estimatedTotal = hasMore ? offset + safeLimit + 1 : offset + (posts?.length || 0);

    logPerformance('/api/posts/feed', startTime);

    // Return results immediately with cache-control headers
    return NextResponse.json(
      {
        success: true,
        data: {
          posts: posts || [],
          pagination: {
            page,
            limit: safeLimit,
            total: estimatedTotal,
            has_more: hasMore,
          },
        },
      },
      { 
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        }
      }
    );

  } catch (error: any) {
    console.error('❌ Feed API error:', error);
    logPerformance('/api/posts/feed', startTime);

    // Always return success with empty data to prevent client loading states
    return NextResponse.json(
      createErrorResponse(error.message || 'Request timeout', {
        posts: [],
        pagination: { page: 1, limit: 15, total: 0, has_more: false }
      }),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        }
      }
    );
  }
}
