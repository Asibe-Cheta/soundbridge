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
    console.log('👥 Get Connections API called');

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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Get connections
    const { data: connections, error: connectionsError, count } = await supabase
      .from('connections')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq('status', 'connected')
      .order('connected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (connectionsError) {
      console.error('❌ Error fetching connections:', connectionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch connections', details: connectionsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            connections: [],
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

    // Get connected user IDs
    const connectedUserIds = connections.map((conn) =>
      conn.user_id === user.id ? conn.connected_user_id : conn.user_id
    );

    // Get profiles
    let profilesQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline, location')
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

    // Format connections
    const formattedConnections = connections
      .map((conn) => {
        const connectedUserId = conn.user_id === user.id ? conn.connected_user_id : conn.user_id;
        const profile = profileMap.get(connectedUserId);

        return {
          id: connectedUserId,
          name: profile?.display_name || profile?.username || 'Unknown',
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          role: profile?.professional_headline,
          location: profile?.location,
          connected_at: conn.connected_at,
        };
      })
      .filter((conn) => {
        // Filter by search if provided
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            conn.name.toLowerCase().includes(searchLower) ||
            conn.username?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      });

    console.log(`✅ Fetched ${formattedConnections.length} connections for user ${user.id}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          connections: formattedConnections,
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
    console.error('❌ Unexpected error fetching connections:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

