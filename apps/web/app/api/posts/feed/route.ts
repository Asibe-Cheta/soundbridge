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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const postType = searchParams.get('type');
    const offset = (page - 1) * limit;

    // EMERGENCY OPTIMIZATION: Minimal query without JOIN
    // Reduce limit to speed up query
    const safeLimit = Math.min(limit, 20); // Cap at 20 for performance

    let query = supabase
      .from('posts')
      .select('id, user_id, content, visibility, post_type, media_urls, likes_count, comments_count, shares_count, created_at, updated_at')
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    // Filter by post type if provided
    if (postType) {
      query = query.eq('post_type', postType);
    }

    console.log('🔍 Executing minimal query (no JOIN)...');

    // Execute with increased timeout to match client 30s timeout
    const { data: posts, error: postsError } = await withQueryTimeout(query, 20000) as any;

    // If we got posts, fetch authors separately (faster than JOIN)
    if (posts && posts.length > 0) {
      const userIds = [...new Set(posts.map((p: any) => p.user_id))];

      try {
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
      } catch (authorError) {
        console.warn('⚠️ Failed to fetch authors, continuing without:', authorError);
        // Continue without authors - posts will have null author
      }
    }

    logPerformance('/api/posts/feed (query)', startTime);

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError);
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

    // Estimate pagination without expensive count
    const hasMore = posts && posts.length === safeLimit;
    const estimatedTotal = hasMore ? offset + safeLimit + 1 : offset + (posts?.length || 0);

    logPerformance('/api/posts/feed', startTime);

    // Return results immediately
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
      { headers: corsHeaders }
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
      { status: 200, headers: corsHeaders }
    );
  }
}
