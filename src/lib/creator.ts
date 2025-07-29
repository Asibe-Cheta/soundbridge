import { createBrowserClient } from './supabase';
import type {
  CreatorProfile,
  AudioTrack,
  Event,
  Follow,
  Message,
  CreatorStats,
  CreatorSearchFilters,
  CreatorSearchResult
} from './types/creator';

export async function getCreatorByUsername(username: string, currentUserId?: string) {
  try {
    const supabase = createBrowserClient();

    // Get creator profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError) {
      console.error('Error fetching creator profile:', profileError);
      return { data: null, error: profileError };
    }

    // Get creator stats
    const stats = await getCreatorStats(profile.id);

    // Check if current user is following this creator
    let isFollowing = false;
    if (currentUserId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
        .single();

      isFollowing = !!followData;
    }

    const creatorWithStats: CreatorProfile = {
      ...profile,
      ...stats,
      is_following: isFollowing
    };

    return { data: creatorWithStats, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator:', error);
    return { data: null, error: error as Error };
  }
}

export async function getCreatorStats(creatorId: string): Promise<CreatorStats> {
  try {
    const supabase = createBrowserClient();

    // Get followers count
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', creatorId);

    // Get following count
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', creatorId);

    // Get tracks count
    const { count: tracksCount } = await supabase
      .from('audio_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('is_public', true);

    // Get events count
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    // Get total plays and likes
    const { data: tracksData } = await supabase
      .from('audio_tracks')
      .select('play_count, like_count')
      .eq('creator_id', creatorId)
      .eq('is_public', true);

    const totalPlays = tracksData?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0;
    const totalLikes = tracksData?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;

    return {
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      tracks_count: tracksCount || 0,
      events_count: eventsCount || 0,
      total_plays: totalPlays,
      total_likes: totalLikes
    };
  } catch (error) {
    console.error('Error getting creator stats:', error);
    return {
      followers_count: 0,
      following_count: 0,
      tracks_count: 0,
      events_count: 0,
      total_plays: 0,
      total_likes: 0
    };
  }
}

export async function getCreatorTracks(creatorId: string, limit = 20): Promise<{ data: AudioTrack[] | null; error: any }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching creator tracks:', error);
      return { data: null, error };
    }

    // Format tracks with computed fields
    const formattedTracks: AudioTrack[] = data?.map(track => ({
      ...track,
      formatted_duration: track.duration ? formatDuration(track.duration) : null,
      formatted_play_count: formatPlayCount(track.play_count)
    })) || [];

    return { data: formattedTracks, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator tracks:', error);
    return { data: null, error: error as Error };
  }
}

export async function getCreatorEvents(creatorId: string, limit = 20): Promise<{ data: Event[] | null; error: any }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('creator_id', creatorId)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching creator events:', error);
      return { data: null, error };
    }

    // Format events with computed fields
    const formattedEvents: Event[] = data?.map(event => ({
      ...event,
      formatted_date: formatEventDate(event.event_date),
      formatted_price: formatEventPrice(event.price_gbp, event.price_ngn, event.country)
    })) || [];

    return { data: formattedEvents, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator events:', error);
    return { data: null, error: error as Error };
  }
}

export async function followCreator(followerId: string, followingId: string): Promise<{ data: Follow | null; error: any }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })
      .select()
      .single();

    if (error) {
      console.error('Error following creator:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error following creator:', error);
    return { data: null, error: error as Error };
  }
}

export async function unfollowCreator(followerId: string, followingId: string): Promise<{ error: any }> {
  try {
    const supabase = createBrowserClient();

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('Error unfollowing creator:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error unfollowing creator:', error);
    return { error: error as Error };
  }
}

export async function getMessages(creatorId: string, currentUserId: string): Promise<{ data: Message[] | null; error: any }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        recipient:profiles!messages_recipient_id_fkey(*)
      `)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }

    // Format messages with computed fields
    const formattedMessages: Message[] = data?.map(message => ({
      ...message,
      formatted_timestamp: formatMessageTimestamp(message.created_at)
    })) || [];

    return { data: formattedMessages, error: null };
  } catch (error) {
    console.error('Unexpected error getting messages:', error);
    return { data: null, error: error as Error };
  }
}

export async function sendMessage(senderId: string, recipientId: string, content: string, messageType: 'text' | 'audio' | 'file' | 'collaboration' = 'text'): Promise<{ data: Message | null; error: any }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error sending message:', error);
    return { data: null, error: error as Error };
  }
}

export async function searchCreators(filters: CreatorSearchFilters, limit = 20): Promise<{ data: CreatorSearchResult[] | null; error: any }> {
  try {
    const supabase = createBrowserClient();

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'creator');

    // Apply filters
    if (filters.genre) {
      query = query.eq('genre', filters.genre);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.country) {
      query = query.eq('country', filters.country);
    }

    const { data: profiles, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching creators:', error);
      return { data: null, error };
    }

    // Get stats and recent content for each creator
    const results: CreatorSearchResult[] = [];
    for (const profile of profiles || []) {
      const stats = await getCreatorStats(profile.id);
      const { data: recentTracks } = await getCreatorTracks(profile.id, 3);
      const { data: upcomingEvents } = await getCreatorEvents(profile.id, 3);

      results.push({
        profile: { ...profile, ...stats },
        stats,
        recent_tracks: recentTracks || [],
        upcoming_events: upcomingEvents || []
      });
    }

    return { data: results, error: null };
  } catch (error) {
    console.error('Unexpected error searching creators:', error);
    return { data: null, error: error as Error };
  }
}

// Utility functions for formatting
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
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

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}

function formatEventPrice(priceGbp: number | null, priceNgn: number | null, country: string | null): string {
  if (country === 'Nigeria' && priceNgn) {
    return `₦${priceNgn.toLocaleString()}`;
  } else if (priceGbp) {
    return `£${priceGbp.toLocaleString()}`;
  }
  return 'Free';
}

function formatMessageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
} 