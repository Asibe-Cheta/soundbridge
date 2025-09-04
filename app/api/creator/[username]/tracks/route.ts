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

    // Get all tracks for this creator
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        description,
        file_url,
        cover_art_url,
        duration,
        genre,
        created_at,
        updated_at,
        play_count,
        like_count,
        creator:profiles!audio_tracks_creator_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false });

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tracks || []
    });

  } catch (error) {
    console.error('Error in tracks API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
