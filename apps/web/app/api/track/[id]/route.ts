import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Track ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch track with creator information
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select(`
        *,
        profiles!audio_tracks_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          location,
          country,
          social_links
        )
      `)
      .eq('id', id as any)
      .single() as { data: any; error: any };

    if (trackError || !track) {
      return NextResponse.json(
        { success: false, error: 'Track not found' },
        { status: 404 }
      );
    }

    // Get similar artists (same genre, different creator)
    const { data: similarTracks, error: similarError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        cover_art_url,
        genre,
        profiles!audio_tracks_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('genre', track.genre as any)
      .neq('creator_id', track.creator_id as any)
      .limit(6) as { data: any; error: any };

    // Get more tracks by the same artist
    const { data: moreByArtist, error: moreError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        cover_art_url,
        genre,
        created_at
      `)
      .eq('creator_id', track.creator_id as any)
      .neq('id', track.id as any)
      .order('created_at', { ascending: false })
      .limit(6) as { data: any; error: any };

    return NextResponse.json({
      success: true,
      data: {
        track,
        similarArtists: similarTracks || [],
        moreByArtist: moreByArtist || []
      }
    });

  } catch (error) {
    console.error('Error fetching track:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
