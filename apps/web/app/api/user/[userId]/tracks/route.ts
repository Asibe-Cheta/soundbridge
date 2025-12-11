import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/user/[userId]/tracks
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user (optional - for showing like status)
    const { data: { user } } = await supabase.auth.getUser();

    const { userId } = params;

    // Get all tracks for this user
    const { data: tracksData, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError);
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500, headers: corsHeaders }
      );
    }

    // If user is logged in, get their likes
    let likedTrackIds: string[] = [];
    if (user && tracksData && tracksData.length > 0) {
      const trackIds = tracksData.map(t => t.id);
      const { data: likesData } = await supabase
        .from('likes')
        .select('track_id')
        .eq('user_id', user.id)
        .in('track_id', trackIds);

      likedTrackIds = likesData?.map(l => l.track_id) || [];
    }

    // Format response with like status
    const tracks = tracksData?.map(track => ({
      id: track.id,
      title: track.title,
      artist_name: track.artist_name,
      audio_url: track.audio_url,
      cover_image_url: track.cover_image_url,
      duration: track.duration,
      play_count: track.play_count || 0,
      likes_count: track.likes_count || 0,
      genre: track.genre,
      created_at: track.created_at,
      is_liked: user ? likedTrackIds.includes(track.id) : false,
      is_owner: user?.id === userId
    })) || [];

    return NextResponse.json(
      {
        success: true,
        tracks,
        count: tracks.length
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in GET /api/user/[userId]/tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
