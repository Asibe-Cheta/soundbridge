import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '4');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('🎙️ Fetching recent podcasts with limit:', limit);

    // Fetch recent podcasts (audio tracks with genre = 'podcast')
    // First, let's check if there are any podcasts in the database
    const { data: podcasts, error } = await supabase
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
        created_at,
        creator:profiles!audio_tracks_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .in('genre', ['podcast', 'Podcast', 'PODCAST'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching podcasts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch podcasts', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Fetched podcasts:', podcasts?.length || 0);
    if (podcasts && podcasts.length > 0) {
      podcasts.forEach((podcast, index) => {
        console.log(`🎙️ Podcast ${index + 1}: "${podcast.title}" - File URL: ${podcast.file_url}`);
      });
    }

    // If no podcasts found, return empty array instead of error
    if (!podcasts || podcasts.length === 0) {
      console.log('📝 No podcasts found, returning empty array');
      return NextResponse.json({
        success: true,
        podcasts: [],
        total: 0
      });
    }

    // Format the podcasts data
    const formattedPodcasts = podcasts?.map(podcast => ({
      id: podcast.id,
      title: podcast.title,
      description: podcast.description,
      creator_id: podcast.creator_id,
      creator_name: Array.isArray(podcast.creator) && podcast.creator.length > 0 
        ? podcast.creator[0].display_name || 'Unknown Creator'
        : (podcast.creator as any)?.display_name || 'Unknown Creator',
      creator_username: Array.isArray(podcast.creator) && podcast.creator.length > 0 
        ? podcast.creator[0].username
        : (podcast.creator as any)?.username,
      creator_avatar: Array.isArray(podcast.creator) && podcast.creator.length > 0 
        ? podcast.creator[0].avatar_url
        : (podcast.creator as any)?.avatar_url,
      file_url: podcast.file_url,
      cover_art_url: podcast.cover_art_url,
      duration: podcast.duration,
      genre: podcast.genre,
      tags: podcast.tags,
      play_count: podcast.play_count || 0,
      likes_count: 0, // Default value since column doesn't exist
      shares_count: 0, // Default value since column doesn't exist
      created_at: podcast.created_at,
      formatted_duration: formatDuration(podcast.duration || 0),
      formatted_play_count: formatPlayCount(podcast.play_count || 0)
    })) || [];

    return NextResponse.json({
      success: true,
      podcasts: formattedPodcasts,
      total: formattedPodcasts.length
    });

  } catch (error) {
    console.error('❌ Error in podcasts API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

// Helper function to format play count
function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
