/**
 * GET /api/search
 * 
 * Search for posts, professionals, and opportunities
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - type: Filter by type ('posts', 'professionals', 'opportunities', or 'all')
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 50)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "posts": [...],
 *     "professionals": [...],
 *     "opportunities": [...],
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
  try {
    console.log('🔍 Search API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const searchTerm = `%${query.trim()}%`;

    const results: {
      posts: any[];
      professionals: any[];
      opportunities: any[];
    } = {
      posts: [],
      professionals: [],
      opportunities: [],
    };

    // Search posts
    if (type === 'all' || type === 'posts') {
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, content, post_type, created_at, user_id')
        .ilike('content', searchTerm)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!postsError && posts) {
        const postIds = posts.map((p) => p.id);
        const userIds = [...new Set(posts.map((p) => p.user_id))];

        // Get authors
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, professional_headline')
          .in('id', userIds);

        // Get engagement counts
        const { data: reactions } = await supabase
          .from('post_reactions')
          .select('post_id')
          .in('post_id', postIds);

        const { data: comments } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds)
          .is('deleted_at', null);

        const authorMap = new Map();
        if (authors) {
          authors.forEach((a) => authorMap.set(a.id, a));
        }

        const reactionCounts = new Map();
        if (reactions) {
          reactions.forEach((r) => {
            reactionCounts.set(r.post_id, (reactionCounts.get(r.post_id) || 0) + 1);
          });
        }

        const commentCounts = new Map();
        if (comments) {
          comments.forEach((c) => {
            commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
          });
        }

        results.posts = posts.map((post) => {
          const author = authorMap.get(post.user_id);
          return {
            id: post.id,
            content: post.content,
            post_type: post.post_type,
            created_at: post.created_at,
            author: {
              id: post.user_id,
              name: author?.display_name || author?.username || 'Unknown',
              username: author?.username,
              avatar_url: author?.avatar_url,
            },
            reaction_count: reactionCounts.get(post.id) || 0,
            comment_count: commentCounts.get(post.id) || 0,
          };
        });
      }
    }

    // Search professionals
    if (type === 'all' || type === 'professionals') {
      const { data: professionals, error: profError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, professional_headline, location, country')
        .or(`display_name.ilike.${searchTerm},username.ilike.${searchTerm},professional_headline.ilike.${searchTerm}`)
        .neq('id', user.id) // Exclude self
        .order('display_name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (!profError && professionals) {
        results.professionals = professionals.map((prof) => ({
          id: prof.id,
          name: prof.display_name || prof.username || 'Unknown',
          username: prof.username,
          avatar_url: prof.avatar_url,
          headline: prof.professional_headline,
          location: prof.location,
          country: prof.country,
        }));
      }
    }

    // Search opportunities (posts with type 'opportunity')
    if (type === 'all' || type === 'opportunities') {
      const { data: opportunities, error: oppError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('post_type', 'opportunity')
        .ilike('content', searchTerm)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!oppError && opportunities) {
        const userIds = [...new Set(opportunities.map((o) => o.user_id))];
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        const authorMap = new Map();
        if (authors) {
          authors.forEach((a) => authorMap.set(a.id, a));
        }

        results.opportunities = opportunities.map((opp) => {
          const author = authorMap.get(opp.user_id);
          return {
            id: opp.id,
            content: opp.content,
            created_at: opp.created_at,
            author: {
              id: opp.user_id,
              name: author?.display_name || author?.username || 'Unknown',
              username: author?.username,
              avatar_url: author?.avatar_url,
            },
          };
        });
      }
    }

    const totalResults =
      results.posts.length + results.professionals.length + results.opportunities.length;

    console.log(`✅ Search completed: ${totalResults} results for query "${query}"`);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...results,
          pagination: {
            page,
            limit,
            total: totalResults,
            has_more: totalResults >= limit,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error searching:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
