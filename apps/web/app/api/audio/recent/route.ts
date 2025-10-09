import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('🎵 Recent tracks API called');
    
    const supabase = createRouteHandlerClient({ cookies });

    // First, test the connection
    const { data: testData, error: testError } = await supabase
      .from('audio_tracks')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Test query failed:', testError);
      return NextResponse.json(
        { error: 'Database connection failed', details: testError.message },
        { status: 500 }
      );
    }

    console.log('✅ Database connection successful');

    // Get recent tracks from all creators, ordered by creation date
    // Exclude podcasts (genre = 'podcast') - podcasts should only appear in the podcasts section
    console.log('🔍 Querying audio_tracks with creator relationship...');
    
    // First, let's test if the relationship works with a simpler query
    const { data: testTracks, error: testRelationshipError } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id')
      .limit(1);
    
    console.log('🔍 Test query result:', { testTracks, testRelationshipError });
    
    // Now try the full query
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        description,
        creator_id,
        file_url,
        cover_art_url,
        duration,
        genre,
        tags,
        play_count,
        like_count,
        is_public,
        created_at,
        artist_name,
        lyrics,
        lyrics_language,
        audio_quality,
        bitrate,
        sample_rate,
        channels,
        codec,
        processing_status,
        processing_completed_at,
        creator:profiles!audio_tracks_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .not('genre', 'eq', 'podcast')
      .not('genre', 'eq', 'Podcast')
      .not('genre', 'eq', 'PODCAST')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('🔍 Raw query result:', { tracks: tracks?.length, error });

    if (error) {
      console.error('❌ Error fetching recent tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent tracks', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Fetched tracks (excluding podcasts):', tracks?.length);
    console.log('✅ Track genres:', tracks?.map(t => t.genre));
    if (tracks && tracks.length > 0) {
      tracks.forEach((track, index) => {
        console.log(`🎵 Track ${index + 1}: "${track.title}" - File URL: ${track.file_url}`);
        console.log(`🎵 Track ${index + 1} creator data:`, {
          creator_id: track.creator_id,
          creator: track.creator,
          display_name: track.creator?.display_name
        });
        console.log(`🚨 Track ${index + 1} LYRICS DEBUG:`, {
          lyrics: track.lyrics,
          lyrics_language: track.lyrics_language,
          has_lyrics: !!track.lyrics,
          lyrics_length: track.lyrics ? track.lyrics.length : 0
        });
        console.log(`🎵 Track ${index + 1} FULL DATA:`, JSON.stringify(track, null, 2));
      });
    }

    // Format the tracks for the frontend
    let formattedTracks;
    
    if (tracks && tracks.length > 0 && tracks[0].creator) {
      // Creator relationship is working
      console.log('✅ Creator relationship is working');
      formattedTracks = tracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.creator?.display_name || 'Unknown Artist',
        coverArt: track.cover_art_url,
        url: track.file_url,
        duration: track.duration || 0,
        plays: track.play_count || 0,
        likes: track.like_count || 0,
        lyrics: track.lyrics || null,
        lyricsLanguage: track.lyrics_language || 'en',
        creator: {
          id: track.creator_id,
          name: track.creator?.display_name || 'Unknown Artist',
          username: track.creator?.username || 'unknown',
          avatar: track.creator?.avatar_url || null
        }
      }));
    } else {
      // Creator relationship is not working, fetch creator data manually
      console.log('⚠️ Creator relationship not working, fetching manually...');
      
      // Get unique creator IDs
      const creatorIds = [...new Set(tracks.map(track => track.creator_id))];
      console.log('🔍 Unique creator IDs:', creatorIds);
      
      // Fetch creator data manually
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', creatorIds);
      
      console.log('🔍 Manual creator fetch result:', { creators, creatorsError });
      
      // Create a map of creator data
      const creatorMap = new Map();
      if (creators) {
        creators.forEach(creator => {
          creatorMap.set(creator.id, creator);
        });
      }
      
      formattedTracks = tracks.map(track => {
        const creator = creatorMap.get(track.creator_id);
        return {
          id: track.id,
          title: track.title,
          artist: creator?.display_name || 'Unknown Artist',
          coverArt: track.cover_art_url,
          url: track.file_url,
          duration: track.duration || 0,
          plays: track.play_count || 0,
          likes: track.like_count || 0,
          lyrics: track.lyrics || null,
          lyricsLanguage: track.lyrics_language || 'en',
          creator: {
            id: track.creator_id,
            name: creator?.display_name || 'Unknown Artist',
            username: creator?.username || 'unknown',
            avatar: creator?.avatar_url || null
          }
        };
      });
    }

    console.log('✅ Returning formatted tracks:', formattedTracks.length);
    if (formattedTracks && formattedTracks.length > 0) {
      formattedTracks.forEach((track, index) => {
        console.log(`🎵 Formatted Track ${index + 1}:`, {
          id: track.id,
          title: track.title,
          artist: track.artist,
          creator_name: track.creator.name,
          lyrics: track.lyrics,
          lyricsLanguage: track.lyricsLanguage,
          has_lyrics: !!track.lyrics
        });
      });
    }

    return NextResponse.json({
      success: true,
      tracks: formattedTracks
    });

  } catch (error) {
    console.error('Error in recent tracks API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
