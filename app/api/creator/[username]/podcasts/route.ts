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

    // Get all podcasts for this creator (assuming podcasts are stored in audio_tracks with a type field)
    const { data: podcasts, error: podcastsError } = await supabase
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
      .eq('type', 'podcast') // Assuming there's a type field to distinguish podcasts
      .order('created_at', { ascending: false });

    if (podcastsError) {
      console.error('Error fetching podcasts:', podcastsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch podcasts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: podcasts || []
    });

  } catch (error) {
    console.error('Error in podcasts API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
