import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('🔍 Debug: Checking audio URLs in database...');
    
    const supabase = createRouteHandlerClient({ cookies });

    // Get all audio tracks with their file URLs
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        file_url,
        cover_art_url,
        creator_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tracks', details: error.message },
        { status: 500 }
      );
    }

    console.log(`🔍 Found ${tracks?.length || 0} tracks in database`);
    
    const debugData = tracks?.map(track => ({
      id: track.id,
      title: track.title,
      file_url: track.file_url,
      has_file_url: !!track.file_url,
      file_url_length: track.file_url?.length || 0,
      cover_art_url: track.cover_art_url,
      creator_id: track.creator_id,
      created_at: track.created_at
    }));

    return NextResponse.json({
      success: true,
      total_tracks: tracks?.length || 0,
      tracks: debugData,
      summary: {
        tracks_with_file_url: tracks?.filter(t => t.file_url).length || 0,
        tracks_without_file_url: tracks?.filter(t => !t.file_url).length || 0,
        sample_file_urls: tracks?.filter(t => t.file_url).slice(0, 3).map(t => t.file_url) || []
      }
    });

  } catch (error) {
    console.error('Error in debug audio URLs API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
