/**
 * GET /api/connections/suggestions
 * 
 * Get connection suggestions for the authenticated user
 * 
 * Algorithm:
 * 1. Mutual connections (people connected to user's connections)
 * 2. Same location/country
 * 3. Similar genres/interests
 * 4. Professionals in same industry
 * 
 * Query Parameters:
 * - limit: Number of suggestions (default: 10, max: 50)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "suggestions": [...]
 *   }
 * }
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
    console.log('💡 Connection Suggestions API called');

    // Authenticate user with timeout
    const { supabase, user, error: authError } = await withAuthTimeout(
      getSupabaseRouteClient(request, true),
      5000
    );

    if (authError || !user) {
      logPerformance('/api/connections/suggestions', startTime);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // OPTIMIZED: Simplified query - just get basic suggestions by location
    // Skip complex mutual connections calculation which causes timeout

    // Get user profile with timeout
    const { data: userProfile } = await withQueryTimeout(
      supabase
        .from('profiles')
        .select('location, country')
        .eq('id', user.id)
        .single(),
      3000
    );

    // Get user's existing connections with timeout
    const { data: connections } = await withQueryTimeout(
      supabase
        .from('connections')
        .select('user_id, connected_user_id')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .limit(100),
      3000
    );

    const connectedUserIds = new Set<string>();
    connectedUserIds.add(user.id); // Exclude self
    if (connections) {
      connections.forEach((conn) => {
        if (conn.user_id === user.id) {
          connectedUserIds.add(conn.connected_user_id);
        } else {
          connectedUserIds.add(conn.user_id);
        }
      });
    }

    // Get pending connection requests with timeout
    const { data: pendingRequests } = await withQueryTimeout(
      supabase
        .from('connection_requests')
        .select('requester_id, recipient_id')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq('status', 'pending')
        .limit(50),
      3000
    );

    const pendingUserIds = new Set<string>();
    if (pendingRequests) {
      pendingRequests.forEach((req) => {
        if (req.requester_id === user.id) {
          pendingUserIds.add(req.recipient_id);
        } else {
          pendingUserIds.add(req.requester_id);
        }
      });
    }

    // OPTIMIZED: Skip complex mutual connections query (causes timeout)
    // Build candidate set (exclude already connected and pending)
    const excludeIds = new Set([...connectedUserIds, ...pendingUserIds]);
    const excludeArray = Array.from(excludeIds);

    // Get candidates based on location with timeout
    let locationQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline, location, country')
      .neq('id', user.id);

    // Only exclude if we have a small set (avoid large IN clauses)
    if (excludeArray.length > 0 && excludeArray.length < 50) {
      locationQuery = locationQuery.not('id', 'in', `(${excludeArray.join(',')})`);
    }

    if (userProfile?.country) {
      locationQuery = locationQuery.eq('country', userProfile.country);
    }

    const { data: locationCandidates } = await withQueryTimeout(
      locationQuery.limit(limit * 2),
      5000
    );

    // OPTIMIZED: Simplified scoring (skip complex calculations)
    const suggestions = (locationCandidates || [])
      .slice(0, limit)
      .map((candidate) => {
        // Determine reason based on available data
        let reason = 'Suggested for you';
        if (userProfile?.location && candidate.location === userProfile.location) {
          reason = 'Same location';
        } else if (userProfile?.country && candidate.country === userProfile.country) {
          reason = 'Same country';
        }

        return {
          id: candidate.id,
          user: {
            id: candidate.id,
            name: candidate.display_name || candidate.username || 'Unknown',
            username: candidate.username,
            avatar_url: candidate.avatar_url,
            role: candidate.professional_headline,
            location: candidate.location,
          },
          reason,
          mutual_connections: undefined, // Skip mutual connections count for performance
        };
      });

    console.log(`✅ Generated ${suggestions.length} connection suggestions for user ${user.id}`);
    logPerformance('/api/connections/suggestions', startTime);

    return NextResponse.json(
      {
        success: true,
        data: {
          suggestions,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error getting suggestions:', error);
    logPerformance('/api/connections/suggestions', startTime);

    return NextResponse.json(
      createErrorResponse('Failed to get suggestions', { suggestions: [] }),
      { status: 200, headers: corsHeaders }
    );
  }
}

