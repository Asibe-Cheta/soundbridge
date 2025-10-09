import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }
    
    console.log('🔍 Debug: Fetching track data for ID:', trackId);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: track, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('id', trackId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching track:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }
    
    console.log('✅ Track data retrieved:', {
      id: track.id,
      title: track.title,
      lyrics: track.lyrics,
      lyrics_language: track.lyrics_language,
      has_lyrics: !!track.lyrics
    });
    
    return NextResponse.json({
      success: true,
      track: {
        id: track.id,
        title: track.title,
        lyrics: track.lyrics,
        lyrics_language: track.lyrics_language,
        has_lyrics: !!track.lyrics,
        full_track: track
      }
    });
    
  } catch (error) {
    console.error('❌ Error in debug track data API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
