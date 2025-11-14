import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { name, description, is_public, cover_image_url } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate name length (max 255 characters)
    if (name.trim().length > 255) {
      return NextResponse.json(
        { error: 'Playlist name must be 255 characters or less' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate description length (max 5000 characters)
    if (description && description.length > 5000) {
      return NextResponse.json(
        { error: 'Description must be 5000 characters or less' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Default is_public to true if not provided
    const isPublic = is_public !== undefined ? Boolean(is_public) : true;

    // Create playlist
    const { data: playlist, error: createError } = await supabase
      .from('playlists')
      .insert([{
        creator_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        is_public: isPublic,
        cover_image_url: cover_image_url || null,
        tracks_count: 0,
        total_duration: 0,
        followers_count: 0
      }])
      .select(`
        *,
        creator:profiles!playlists_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (createError) {
      console.error('Playlist creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create playlist', details: createError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      playlist
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Playlist creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET - List playlists (public or user's playlists)
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseRouteClient(request, false);
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('playlists')
      .select(`
        *,
        creator:profiles!playlists_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by user if userId provided
    if (userId) {
      query = query.eq('creator_id', userId);
    }

    // Filter by public if specified
    if (isPublic) {
      query = query.eq('is_public', true);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: playlists, error } = await query;

    if (error) {
      console.error('Error fetching playlists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch playlists', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      playlists: playlists || [],
      total: playlists?.length || 0
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Playlists fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

