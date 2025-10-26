import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch user's playlists (both public and private if authenticated)
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        id,
        name,
        description,
        cover_image_url,
        tracks_count,
        total_duration,
        followers_count,
        is_public,
        created_at,
        updated_at,
        creator:profiles!playlists_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user playlists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch playlists', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Fetched ${playlists?.length || 0} playlists for user ${userId}`);

    return NextResponse.json({
      success: true,
      playlists: playlists || [],
      count: playlists?.length || 0,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error fetching user playlists:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    }
  });
}
