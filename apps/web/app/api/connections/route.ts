/**
 * GET /api/connections
 * 
 * Get user's connections
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Connections per page (default: 20)
 * - search: Search by name (optional)
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Mobile parity source-of-truth: follows table.
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('follower_id, following_id, created_at')
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (followsError) {
      console.error('Error fetching follows for connections:', followsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch connections', details: followsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const dedupMap = new Map<string, { connected_at: string }>();
    for (const row of follows || []) {
      const otherId = row.follower_id === user.id ? row.following_id : row.follower_id;
      if (!otherId || otherId === user.id) continue;
      const prev = dedupMap.get(otherId);
      if (!prev || new Date(row.created_at).getTime() > new Date(prev.connected_at).getTime()) {
        dedupMap.set(otherId, { connected_at: row.created_at });
      }
    }

    const connectedUserIds = Array.from(dedupMap.keys());
    if (connectedUserIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            connections: [],
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

    let profilesQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, role, bio, professional_headline, location')
      .in('id', connectedUserIds);

    if (search) {
      profilesQuery = profilesQuery.or(
        `display_name.ilike.%${search}%,username.ilike.%${search}%`
      );
    }

    const { data: profiles } = await profilesQuery;

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p) => profileMap.set(p.id, p));
    }

    const formattedConnections = connectedUserIds
      .map((connectedUserId) => {
        const profile = profileMap.get(connectedUserId);
        return {
          id: connectedUserId,
          user_id: user.id,
          connected_user_id: connectedUserId,
          connected_at: dedupMap.get(connectedUserId)?.connected_at || null,
          user: {
            id: connectedUserId,
            username: profile?.username,
            display_name: profile?.display_name || profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url,
            headline: profile?.professional_headline || (profile?.bio ? String(profile.bio).slice(0, 120) : null),
          },
          name: profile?.display_name || profile?.username || 'Unknown',
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          role: profile?.role || profile?.professional_headline || null,
          location: profile?.location,
        };
      })
      .filter((conn) => {
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            conn.name.toLowerCase().includes(searchLower) ||
            conn.username?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      });

    const total = formattedConnections.length;
    const paginated = formattedConnections.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          connections: paginated,
          pagination: {
            page,
            limit,
            total,
            has_more: total > offset + limit,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching connections:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

