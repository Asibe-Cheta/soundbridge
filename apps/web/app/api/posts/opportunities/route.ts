/**
 * GET /api/posts/opportunities
 * 
 * Get opportunity posts (collaboration, gigs, etc.)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Posts per page (default: 15, max: 50)
 * - location: Filter by location (optional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
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
    console.log('💼 Opportunities Feed API called');

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const location = searchParams.get('location');
    const offset = (page - 1) * limit;

    // Get user profile for location-based filtering
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('location, country')
      .eq('id', user.id)
      .single();

    // Build query for opportunity posts
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('post_type', 'opportunity')
      .is('deleted_at', null)
      .or('visibility.eq.public,visibility.eq.connections')
      .order('created_at', { ascending: false });

    // Filter by location if provided
    if (location || userProfile?.location) {
      // This is a simplified location filter
      // In production, you might want to use geolocation or more sophisticated matching
      const filterLocation = location || userProfile?.location;
      // Note: This requires joining with profiles table, which we'll do after fetching
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: opportunities, error: oppError, count } = await query;

    if (oppError) {
      console.error('❌ Error fetching opportunities:', oppError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch opportunities', details: oppError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            opportunities: [],
            pagination: {
              page,
              limit,
              total: count || 0,
              has_more: false,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // Get authors and filter by location if needed
    const userIds = [...new Set(opportunities.map((o) => o.user_id))];
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline, location, country')
      .in('id', userIds);

    // Filter by location if specified
    let filteredOpportunities = opportunities;
    if (location || userProfile?.location) {
      const filterLocation = (location || userProfile?.location)?.toLowerCase();
      const authorMap = new Map();
      if (authors) {
        authors.forEach((a) => authorMap.set(a.id, a));
      }

      filteredOpportunities = opportunities.filter((opp) => {
        const author = authorMap.get(opp.user_id);
        return author?.location?.toLowerCase().includes(filterLocation || '') ||
               author?.country?.toLowerCase().includes(filterLocation || '');
      });
    }

    // Get engagement data
    const oppIds = filteredOpportunities.map((o) => o.id);
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id')
      .in('post_id', oppIds);

    const { data: comments } = await supabase
      .from('post_comments')
      .select('post_id')
      .in('post_id', oppIds)
      .is('deleted_at', null);

    // Build maps
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

    // Format opportunities
    const formattedOpportunities = filteredOpportunities.map((opp) => {
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
          headline: author?.professional_headline,
          location: author?.location,
          country: author?.country,
        },
        reaction_count: reactionCounts.get(opp.id) || 0,
        comment_count: commentCounts.get(opp.id) || 0,
      };
    });

    console.log(`✅ Fetched ${formattedOpportunities.length} opportunities`);

    return NextResponse.json(
      {
        success: true,
        data: {
          opportunities: formattedOpportunities,
          pagination: {
            page,
            limit,
            total: count || 0,
            has_more: (count || 0) > offset + limit,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching opportunities:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

