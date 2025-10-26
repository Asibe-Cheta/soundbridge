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
        { success: false, error: 'Podcast ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch podcast with creator information
    const { data: podcast, error: podcastError } = await supabase
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
      .eq('genre', 'podcast' as any)
      .single() as { data: any; error: any };

    if (podcastError || !podcast) {
      return NextResponse.json(
        { success: false, error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Get similar podcasts (same genre, different creator)
    const { data: similarPodcasts, error: similarError } = await supabase
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
      .eq('genre', 'podcast' as any)
      .neq('creator_id', podcast.creator_id as any)
      .limit(6) as { data: any; error: any };

    // Get more podcasts by the same artist
    const { data: moreByArtist, error: moreError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        cover_art_url,
        genre,
        created_at
      `)
      .eq('creator_id', podcast.creator_id as any)
      .eq('genre', 'podcast' as any)
      .neq('id', podcast.id as any)
      .order('created_at', { ascending: false })
      .limit(6) as { data: any; error: any };

    return NextResponse.json({
      success: true,
      data: {
        podcast,
        similarArtists: similarPodcasts || [],
        moreByArtist: moreByArtist || []
      }
    });

  } catch (error) {
    console.error('Error fetching podcast:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
