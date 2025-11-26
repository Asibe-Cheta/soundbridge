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
    console.log('💡 Connection Suggestions API called');

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('location, country, country_code, genres, professional_headline')
      .eq('id', user.id)
      .single();

    // Get user's existing connections
    const { data: connections } = await supabase
      .from('connections')
      .select('user_id, connected_user_id')
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

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

    // Get pending connection requests
    const { data: pendingRequests } = await supabase
      .from('connection_requests')
      .select('requester_id, recipient_id')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'pending');

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

    // Get connections of connections (mutual connections)
    const { data: connectionsOfConnections } = await supabase
      .from('connections')
      .select('user_id, connected_user_id')
      .in('user_id', Array.from(connectedUserIds))
      .in('connected_user_id', Array.from(connectedUserIds));

    const mutualConnectionMap = new Map<string, number>();
    if (connectionsOfConnections) {
      connectionsOfConnections.forEach((conn) => {
        // Find users who are connected to user's connections but not to user
        if (connectedUserIds.has(conn.user_id) && !connectedUserIds.has(conn.connected_user_id)) {
          mutualConnectionMap.set(
            conn.connected_user_id,
            (mutualConnectionMap.get(conn.connected_user_id) || 0) + 1
          );
        }
        if (connectedUserIds.has(conn.connected_user_id) && !connectedUserIds.has(conn.user_id)) {
          mutualConnectionMap.set(
            conn.user_id,
            (mutualConnectionMap.get(conn.user_id) || 0) + 1
          );
        }
      });
    }

    // Build candidate set (exclude already connected and pending)
    const excludeIds = new Set([...connectedUserIds, ...pendingUserIds]);

    // Get candidates based on location
    let locationQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline, location, country, genres')
      .neq('id', user.id)
      .not('id', 'in', `(${Array.from(excludeIds).join(',')})`);

    if (userProfile?.country) {
      locationQuery = locationQuery.eq('country', userProfile.country);
    }

    const { data: locationCandidates } = await locationQuery.limit(limit * 2);

    // Score and rank candidates
    const scoredCandidates = new Map<string, {
      profile: any;
      score: number;
      reasons: string[];
    }>();

    if (locationCandidates) {
      locationCandidates.forEach((candidate) => {
        let score = 0;
        const reasons: string[] = [];

        // Mutual connections bonus (highest priority)
        const mutualCount = mutualConnectionMap.get(candidate.id) || 0;
        if (mutualCount > 0) {
          score += mutualCount * 50;
          reasons.push(`${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`);
        }

        // Same location bonus
        if (userProfile?.location && candidate.location) {
          if (userProfile.location.toLowerCase() === candidate.location.toLowerCase()) {
            score += 30;
            reasons.push('Same location');
          }
        }

        // Same country bonus
        if (userProfile?.country && candidate.country === userProfile.country) {
          score += 20;
          if (!reasons.includes('Same location')) {
            reasons.push('Same country');
          }
        }

        // Similar genres/interests
        if (userProfile?.genres && candidate.genres && Array.isArray(candidate.genres)) {
          const commonGenres = userProfile.genres.filter((g) => candidate.genres.includes(g));
          if (commonGenres.length > 0) {
            score += commonGenres.length * 10;
            reasons.push(`Shared interests: ${commonGenres.slice(0, 2).join(', ')}`);
          }
        }

        // Professional headline similarity (basic keyword matching)
        if (userProfile?.professional_headline && candidate.professional_headline) {
          const userKeywords = userProfile.professional_headline.toLowerCase().split(/\s+/);
          const candidateKeywords = candidate.professional_headline.toLowerCase().split(/\s+/);
          const commonKeywords = userKeywords.filter((k) => candidateKeywords.includes(k));
          if (commonKeywords.length > 0) {
            score += commonKeywords.length * 5;
          }
        }

        if (score > 0) {
          scoredCandidates.set(candidate.id, {
            profile: candidate,
            score,
            reasons,
          });
        }
      });
    }

    // Sort by score and take top results
    const suggestions = Array.from(scoredCandidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => {
        const mutualCount = mutualConnectionMap.get(item.profile.id) || 0;
        const reasons = item.reasons;
        const reasonText = reasons.length > 0 
          ? reasons[0] 
          : 'Suggested for you';
        
        return {
          id: item.profile.id,
          user: {
            id: item.profile.id,
            name: item.profile.display_name || item.profile.username || 'Unknown',
            username: item.profile.username,
            avatar_url: item.profile.avatar_url,
            role: item.profile.professional_headline,
            location: item.profile.location,
          },
          reason: reasonText,
          mutual_connections: mutualCount > 0 ? mutualCount : undefined,
        };
      });

    console.log(`✅ Generated ${suggestions.length} connection suggestions for user ${user.id}`);

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
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

