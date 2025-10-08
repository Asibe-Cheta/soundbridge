import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackTitle = searchParams.get('title');
    
    if (!trackTitle) {
      return NextResponse.json({ error: 'Track title parameter required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    console.log('🔍 Debug: Looking for track with title:', trackTitle);

    // Search for the track by title
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        artist_name,
        lyrics,
        lyrics_language,
        created_at,
        updated_at
      `)
      .ilike('title', `%${trackTitle}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching track:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('🔍 Found tracks:', tracks?.length);
    tracks?.forEach((track, index) => {
      console.log(`Track ${index + 1}:`, {
        id: track.id,
        title: track.title,
        artist_name: track.artist_name,
        has_lyrics: !!track.lyrics,
        lyrics_length: track.lyrics?.length || 0,
        lyrics_language: track.lyrics_language,
        created_at: track.created_at,
        lyrics_preview: track.lyrics?.substring(0, 100) + (track.lyrics?.length > 100 ? '...' : '')
      });
    });

    return NextResponse.json({
      success: true,
      tracks: tracks || [],
      message: `Found ${tracks?.length || 0} tracks matching "${trackTitle}"`
    });

  } catch (error) {
    console.error('Error in debug track lyrics API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
