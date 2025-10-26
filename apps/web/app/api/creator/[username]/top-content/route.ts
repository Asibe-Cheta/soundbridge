import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const supabase = createServiceClient();

    // First, get the creator by username
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('username', username)
      .eq('role', 'creator')
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Get top songs based on play count and like count
    const { data: topSongs, error: songsError } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        description,
        genre,
        play_count,
        like_count,
        created_at,
        cover_art_url,
        file_url,
        duration,
        creator:profiles!audio_tracks_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('creator_id', creator.id)
      .eq('is_public', true)
      .order('play_count', { ascending: false })
      .limit(limit);

    if (songsError) {
      console.error('Error fetching top songs:', songsError);
    }

    // Get top events based on recent uploads and attendee count
    const { data: topEvents, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        location,
        price,
        attendee_count,
        image_url,
        created_at,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('creator_id', creator.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventsError) {
      console.error('Error fetching top events:', eventsError);
    }

    // Calculate engagement scores for songs
    const songsWithScores = (topSongs || []).map((song: any) => {
      const playCount = song.play_count || 0;
      const likeCount = song.like_count || 0;
      const engagementRate = playCount > 0 ? (likeCount / playCount) * 100 : 0;
      
      // Calculate a composite score (similar to hot creators algorithm)
      const engagementScore = Math.min(engagementRate * 10, 100); // Good engagement = 10%+
      const popularityScore = Math.min(playCount / 1000, 100); // Cap at 100k plays
      const recencyScore = Math.max(0, 100 - (Date.now() - new Date(song.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)); // Decay over 30 days
      
      const compositeScore = (engagementScore * 0.4) + (popularityScore * 0.4) + (recencyScore * 0.2);
      
      return {
        ...song,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        composite_score: Math.round(compositeScore * 100) / 100,
        formatted_duration: formatDuration(song.duration),
        formatted_play_count: formatPlayCount(playCount),
        formatted_like_count: formatPlayCount(likeCount)
      };
    });

    // Sort songs by composite score
    songsWithScores.sort((a: any, b: any) => b.composite_score - a.composite_score);

    // Format events
    const formattedEvents = (topEvents || []).map((event: any) => ({
      ...event,
      formatted_date: formatEventDate(event.event_date),
      formatted_price: formatEventPrice(event.price),
      days_until_event: calculateDaysUntilEvent(event.event_date)
    }));

    return NextResponse.json({
      success: true,
      data: {
        creator: {
          id: creator.id,
          username: creator.username,
          display_name: creator.display_name
        },
        top_songs: songsWithScores,
        top_events: formattedEvents,
        metrics: {
          total_songs: songsWithScores.length,
          total_events: formattedEvents.length,
          algorithm_info: {
            song_scoring: {
              engagement_rate: "40% weight",
              popularity: "40% weight", 
              recency: "20% weight"
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching top content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top content' },
      { status: 500 }
    );
  }
}

// Utility functions
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'Past event';
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays <= 7) {
    return `In ${diffDays} days`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}

function formatEventPrice(price: number | null): string {
  if (!price || price === 0) return 'Free';
  return `£${price.toFixed(2)}`;
}

function calculateDaysUntilEvent(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

