import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const { username } = resolvedParams;

    const supabase = createServiceClient();

    // First, get the creator's profile
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get all tracks for this creator using the same query as getCreatorTracks
    const { data, error } = await supabase
      .from('audio_tracks')
      .select(`
        *,
        creator:profiles!audio_tracks_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          location,
          country
        )
      `)
      .eq('creator_id', creator.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tracks:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    // Transform the data to match AudioTrack interface (same as getCreatorTracks)
    const transformedData = (data || []).map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      creator_id: track.creator_id,
      file_url: track.file_url,
      cover_art_url: track.cover_art_url,
      duration: track.duration,
      genre: track.genre,
      tags: track.tags,
      play_count: track.play_count || 0,
      like_count: track.likes_count || 0,
      is_public: track.is_public !== false,
      created_at: track.created_at,
      creator: track.creator ? {
        id: track.creator.id,
        username: track.creator.username,
        display_name: track.creator.display_name,
        avatar_url: track.creator.avatar_url,
        banner_url: null,
        location: track.creator.location,
        country: track.creator.country,
        bio: null,
        role: 'creator' as const,
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      } : undefined
    }));

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error in tracks API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
