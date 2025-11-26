/**
 * GET /api/posts/feed
 * 
 * Get personalized feed posts for authenticated user
 * 
 * Feed Algorithm Priority:
 * 1. Connection posts (highest priority)
 * 2. Nearby professionals (same country/city)
 * 3. Opportunity posts
 * 4. Recommended content (public posts with high engagement)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Posts per page (default: 15, max: 50)
 * - type: Filter by post type (optional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "posts": [...],
 *     "pagination": { page, limit, total, has_more }
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

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('📰 Get Feed API called');

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const postType = searchParams.get('type');
    const offset = (page - 1) * limit;

    // Get user profile for location-based recommendations
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('location, country, country_code')
      .eq('id', user.id)
      .single();

    // Get user's connections
    const { data: connections } = await supabase
      .from('connections')
      .select('user_id, connected_user_id')
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

    const connectedUserIds = new Set<string>();
    connectedUserIds.add(user.id); // Include own posts
    if (connections) {
      connections.forEach((conn) => {
        if (conn.user_id === user.id) {
          connectedUserIds.add(conn.connected_user_id);
        } else {
          connectedUserIds.add(conn.user_id);
        }
      });
    }

    // Fetch all eligible posts (we'll rank them in memory)
    // Optimized: Only select needed columns, use index-friendly query
    // Get all public posts and connection posts, filter in memory
    let query = supabase
      .from('posts')
      .select('id, user_id, content, visibility, post_type, created_at, deleted_at')
      .is('deleted_at', null)
      .in('visibility', ['public', 'connections'])
      .order('created_at', { ascending: false })
      .limit(200); // Fetch more than needed for ranking

    // Filter by post type if provided
    if (postType) {
      query = query.eq('post_type', postType);
    }

    console.log('🔍 Querying posts from database...');
    const { data: allPosts, error: postsError } = await query;

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts', details: postsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`📊 Found ${allPosts?.length || 0} posts from database`);

    if (!allPosts || allPosts.length === 0) {
      console.log('📭 No posts found in database');
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Filter out connection-only posts where user is not connected
    const eligiblePosts = allPosts.filter((post) => {
      // Include public posts
      if (post.visibility === 'public') return true;
      // Include connection posts only if user is connected or it's their own post
      if (post.visibility === 'connections') {
        return connectedUserIds.has(post.user_id);
      }
      return false;
    });

    if (eligiblePosts.length === 0) {
      console.log('📭 No eligible posts after filtering');
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: 0,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get post authors' profiles for location matching
    // Optimized: Batch query, only select needed columns
    const postAuthorIds = [...new Set(allPosts.map((p) => p.user_id))];
    const { data: authorProfiles } = await supabase
      .from('profiles')
      .select('id, location, country, country_code')
      .in('id', postAuthorIds)
      .limit(postAuthorIds.length); // Explicit limit for query planner

    // Get engagement metrics for ranking
    // Optimized: Batch queries, only select needed columns
    const postIds = allPosts.map((p) => p.id);
    const [engagementReactionsResult, engagementCommentsResult] = await Promise.all([
      supabase
        .from('post_reactions')
        .select('post_id')
        .in('post_id', postIds),
      supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds)
        .is('deleted_at', null),
    ]);

    const reactions = engagementReactionsResult.data;
    const comments = engagementCommentsResult.data;

    // Calculate engagement scores
    const engagementMap = new Map<string, number>();
    allPosts.forEach((post) => {
      const reactionCount = reactions?.filter((r) => r.post_id === post.id).length || 0;
      const commentCount = comments?.filter((c) => c.post_id === post.id).length || 0;
      const engagementScore = reactionCount * 2 + commentCount * 3; // Comments weighted more
      engagementMap.set(post.id, engagementScore);
    });

    // Build author profile map
    const authorProfileMap = new Map();
    if (authorProfiles) {
      authorProfiles.forEach((p) => authorProfileMap.set(p.id, p));
    }

    // Rank posts by priority
    const rankedPosts = eligiblePosts
      .map((post) => {
        const authorProfile = authorProfileMap.get(post.user_id);
        const isConnected = connectedUserIds.has(post.user_id);
        const isOwnPost = post.user_id === user.id;
        const isOpportunity = post.post_type === 'opportunity';
        const engagementScore = engagementMap.get(post.id) || 0;

        // Priority scoring
        let priority = 0;

        // 1. Connection posts (highest priority)
        if (isConnected && !isOwnPost) {
          priority = 1000;
        }
        // 2. Own posts
        else if (isOwnPost) {
          priority = 900;
        }
        // 3. Nearby professionals (same country)
        else if (
          userProfile?.country &&
          authorProfile?.country === userProfile.country
        ) {
          priority = 800;
          // Bonus for same city
          if (
            userProfile?.location &&
            authorProfile?.location &&
            userProfile.location.toLowerCase() === authorProfile.location.toLowerCase()
          ) {
            priority = 850;
          }
        }
        // 4. Opportunity posts
        else if (isOpportunity) {
          priority = 700;
        }
        // 5. Recommended content (public posts with high engagement)
        else if (post.visibility === 'public' && engagementScore > 5) {
          priority = 600 + Math.min(engagementScore, 100); // Cap engagement bonus
        }
        // 6. Other public posts
        else if (post.visibility === 'public') {
          priority = 500;
        }
        // 7. Connection visibility posts (not connected)
        else {
          priority = 400;
        }

        // Recency bonus (newer posts get slight boost)
        const hoursSinceCreation = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
        const recencyBonus = Math.max(0, 50 - hoursSinceCreation * 2); // Decay over 25 hours

        return {
          post,
          priority: priority + recencyBonus,
          isConnected,
          engagementScore,
        };
      })
      .sort((a, b) => b.priority - a.priority) // Sort by priority descending
      .map((item) => item.post);

    // Apply pagination
    const paginatedPosts = rankedPosts.slice(offset, offset + limit);

    // Early return if no posts to fetch details for
    if (paginatedPosts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: rankedPosts.length,
              has_more: rankedPosts.length > offset + limit,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get detailed data for paginated posts
    // Optimized: Parallel batch queries
    const paginatedPostIds = paginatedPosts.map((p) => p.id);
    const paginatedUserIds = [...new Set(paginatedPosts.map((p) => p.user_id))];

    // Ensure we have valid IDs before querying
    if (paginatedPostIds.length === 0 || paginatedUserIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            posts: [],
            pagination: {
              page,
              limit,
              total: rankedPosts.length,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    const [profilesResult, reactionsResult, attachmentsResult, commentsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, professional_headline')
        .in('id', paginatedUserIds),
      supabase
        .from('post_reactions')
        .select('post_id, user_id, reaction_type')
        .in('post_id', paginatedPostIds),
      supabase
        .from('post_attachments')
        .select('*')
        .in('post_id', paginatedPostIds),
      supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', paginatedPostIds)
        .is('deleted_at', null),
    ]);

    // Check for query errors
    if (profilesResult.error) {
      console.error('❌ Error fetching profiles:', profilesResult.error);
    }
    if (reactionsResult.error) {
      console.error('❌ Error fetching reactions:', reactionsResult.error);
    }
    if (attachmentsResult.error) {
      console.error('❌ Error fetching attachments:', attachmentsResult.error);
    }
    if (commentsResult.error) {
      console.error('❌ Error fetching comments:', commentsResult.error);
    }

    const profiles = profilesResult.data || [];
    const postReactions = reactionsResult.data || [];
    const attachments = attachmentsResult.data || [];
    const commentCounts = commentsResult.data || [];

    // Build maps
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p) => profileMap.set(p.id, p));
    }

    const reactionsMap = new Map();
    if (postReactions) {
      postReactions.forEach((r) => {
        if (!reactionsMap.has(r.post_id)) {
          reactionsMap.set(r.post_id, {
            support: 0,
            love: 0,
            fire: 0,
            congrats: 0,
            user_reaction: null,
          });
        }
        const reactionCounts = reactionsMap.get(r.post_id);
        reactionCounts[r.reaction_type]++;
        if (r.user_id === user.id) {
          reactionCounts.user_reaction = r.reaction_type;
        }
      });
    }

    const attachmentsMap = new Map();
    if (attachments) {
      attachments.forEach((a) => {
        if (!attachmentsMap.has(a.post_id)) {
          attachmentsMap.set(a.post_id, []);
        }
        attachmentsMap.get(a.post_id).push(a);
      });
    }

    const commentCountsMap = new Map();
    if (commentCounts) {
      commentCounts.forEach((c) => {
        commentCountsMap.set(c.post_id, (commentCountsMap.get(c.post_id) || 0) + 1);
      });
    }

    // Format posts
    const formattedPosts = paginatedPosts.map((post) => {
      const profile = profileMap.get(post.user_id);
      const isConnected = connectedUserIds.has(post.user_id) && post.user_id !== user.id;

      return {
        id: post.id,
        content: post.content,
        visibility: post.visibility,
        post_type: post.post_type,
        created_at: post.created_at,
        author: {
          id: post.user_id,
          name: profile?.display_name || profile?.username || 'Unknown',
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          role: profile?.professional_headline,
        },
        attachments: attachmentsMap.get(post.id) || [],
        reactions: reactionsMap.get(post.id) || {
          support: 0,
          love: 0,
          fire: 0,
          congrats: 0,
          user_reaction: null,
        },
        comment_count: commentCountsMap.get(post.id) || 0,
        is_connected: isConnected,
      };
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Fetched ${formattedPosts.length} ranked posts for user ${user.id} in ${elapsedTime}ms`);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          posts: formattedPosts,
          pagination: {
            page,
            limit,
            total: rankedPosts.length,
            has_more: rankedPosts.length > offset + limit,
          },
        },
      },
      { headers: corsHeaders }
    );

    console.log('📤 Sending feed response...');
    return response;
  } catch (error: any) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ Unexpected error fetching feed (after ${elapsedTime}ms):`, error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
