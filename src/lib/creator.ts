import { createBrowserClient } from './supabase';
import type { Profile, Follow } from './types';
import type { AudioTrack, Event, Message } from './types/creator';

export interface CreatorSearchResult {
  profile: Profile;
  stats: {
    followers_count: number;
    tracks_count: number;
    events_count: number;
    total_plays: number;
    total_likes: number;
  };
}

export interface CreatorSearchFilters {
  genre?: string;
  location?: string;
  country?: 'UK' | 'Nigeria';
  sortBy?: 'popular' | 'recent' | 'name';
  limit?: number;
}

export interface CreatorStats {
  followers_count: number;
  tracks_count: number;
  events_count: number;
  total_plays: number;
  total_likes: number;
  engagement_rate: number;
}

/**
 * Get a creator's profile by username
 */
export async function getCreatorByUsername(username: string): Promise<{ data: Profile | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('role', 'creator')
      .single();

    if (error) {
      console.error('Error fetching creator:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator:', error);
    return { data: null, error };
  }
}

/**
 * Get creator stats
 */
export async function getCreatorStats(creatorId: string): Promise<{ data: CreatorStats | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    // Get followers count
    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', creatorId);

    if (followersError) {
      console.error('Error fetching followers count:', followersError);
      return { data: null, error: followersError };
    }

    // Get tracks count
    const { count: tracksCount, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('is_public', true);

    if (tracksError) {
      console.error('Error fetching tracks count:', tracksError);
      return { data: null, error: tracksError };
    }

    // Get events count
    const { count: eventsCount, error: eventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    if (eventsError) {
      console.error('Error fetching events count:', eventsError);
      return { data: null, error: eventsError };
    }

    // Get total plays and likes from tracks
    const { data: tracks, error: tracksDataError } = await supabase
      .from('audio_tracks')
      .select('play_count, like_count')
      .eq('creator_id', creatorId)
      .eq('is_public', true);

    if (tracksDataError) {
      console.error('Error fetching tracks data:', tracksDataError);
      return { data: null, error: tracksDataError };
    }

    const totalPlays = tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0;
    const totalLikes = tracks?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;
    const engagementRate = totalPlays > 0 ? (totalLikes / totalPlays) * 100 : 0;

    const stats: CreatorStats = {
      followers_count: followersCount || 0,
      tracks_count: tracksCount || 0,
      events_count: eventsCount || 0,
      total_plays: totalPlays,
      total_likes: totalLikes,
      engagement_rate: engagementRate,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator stats:', error);
    return { data: null, error };
  }
}

/**
 * Get creator's tracks
 */
export async function getCreatorTracks(creatorId: string, limit = 20): Promise<{ data: AudioTrack[] | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('audio_tracks')
      .select(`
        *,
        creator:profiles!audio_tracks_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          location,
          country
        )
      `)
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching creator tracks:', error);
      return { data: null, error };
    }

    // Transform the data to match AudioTrack interface
    const transformedData = (data || []).map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      creator_id: track.creator_id,
      file_url: track.file_url,
      cover_art_url: track.cover_art_url,
      duration: track.duration,
      genre: track.genre,
      tags: track.tags,
      play_count: track.play_count || 0,
      like_count: track.likes_count || 0,
      is_public: track.is_public !== false,
      created_at: track.created_at,
      creator: track.creator ? {
        id: track.creator.id,
        username: track.creator.username,
        display_name: track.creator.display_name,
        avatar_url: track.creator.avatar_url,
        banner_url: null,
        location: track.creator.location,
        country: track.creator.country,
        bio: null,
        role: 'creator',
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      } : undefined
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator tracks:', error);
    return { data: null, error };
  }
}

/**
 * Get creator's events
 */
export async function getCreatorEvents(creatorId: string, limit = 20): Promise<{ data: Event[] | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          location,
          country
        ),
        attendees:event_attendees!event_attendees_event_id_fkey(count)
      `)
      .eq('creator_id', creatorId)
      .order('event_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching creator events:', error);
      return { data: null, error };
    }

    // Transform the data to match Event interface
    const transformedData = (data || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      creator_id: event.creator_id,
      event_date: event.event_date,
      location: event.location,
      venue: event.venue,
      latitude: event.latitude,
      longitude: event.longitude,
      category: event.category,
      price_gbp: event.price_gbp,
      price_ngn: event.price_ngn,
      max_attendees: event.max_attendees,
      current_attendees: event.current_attendees,
      image_url: event.image_url,
      created_at: event.created_at,
      creator: event.creator ? {
        id: event.creator.id,
        username: event.creator.username,
        display_name: event.creator.display_name,
        avatar_url: event.creator.avatar_url,
        banner_url: null,
        location: event.creator.location,
        country: event.creator.country,
        bio: null,
        role: 'creator',
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      } : undefined
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error getting creator events:', error);
    return { data: null, error };
  }
}

/**
 * Follow a creator
 */
export async function followCreator(followerId: string, followingId: string): Promise<{ data: Follow | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing follow:', checkError);
      return { data: null, error: checkError };
    }

    if (existingFollow) {
      return { data: existingFollow, error: null };
    }

    // Create new follow
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
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
    return { data: null, error };
  }
}

/**
 * Unfollow a creator
 */
export async function unfollowCreator(followerId: string, followingId: string): Promise<{ error: unknown }> {
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
    return { error };
  }
}

/**
 * Get messages between current user and creator
 */
export async function getMessages(creatorId: string, currentUserId: string): Promise<{ data: Message[] | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        ),
        recipient:profiles!messages_recipient_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }

    // Transform the data to match Message interface
    const transformedData = (data || []).map(message => ({
      id: message.id,
      sender_id: message.sender_id,
      recipient_id: message.recipient_id,
      content: message.content,
      message_type: message.message_type as 'text' | 'audio' | 'file' | 'collaboration',
      is_read: message.is_read,
      created_at: message.created_at,
      sender: message.sender ? {
        id: message.sender.id,
        username: message.sender.username,
        display_name: message.sender.display_name,
        avatar_url: message.sender.avatar_url,
        location: message.sender.location,
        country: message.sender.country,
        bio: null,
        role: 'creator',
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      } : undefined,
      recipient: message.recipient ? {
        id: message.recipient.id,
        username: message.recipient.username,
        display_name: message.recipient.display_name,
        avatar_url: message.recipient.avatar_url,
        location: message.recipient.location,
        country: message.recipient.country,
        bio: null,
        role: 'creator',
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      } : undefined
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error getting messages:', error);
    return { data: null, error };
  }
}

/**
 * Send a message to a creator
 */
export async function sendMessage(
  senderId: string,
  recipientId: string,
  content: string,
  messageType: 'text' | 'audio' | 'collaboration' = 'text'
): Promise<{ data: Message | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content,
        message_type: messageType,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        ),
        recipient:profiles!messages_recipient_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error sending message:', error);
    return { data: null, error };
  }
}

/**
 * Search creators with filters
 */
export async function searchCreators(filters: CreatorSearchFilters, limit = 20): Promise<{ data: CreatorSearchResult[] | null; error: unknown }> {
  try {
    const supabase = createBrowserClient();

    let query = supabase
      .from('profiles')
      .select(`
        *,
        followers:follows!follows_following_id_fkey(count),
        tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
        events:events!events_creator_id_fkey(count)
      `)
      .eq('role', 'creator');

    // Apply filters
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.country) {
      query = query.eq('country', filters.country);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'popular':
        query = query.order('created_at', { ascending: false });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'name':
        query = query.order('display_name', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error searching creators:', error);
      return { data: null, error };
    }

    // Transform data to include stats
    const creators = data?.map(profile => ({
      profile,
      stats: {
        followers_count: profile.followers?.[0]?.count || 0,
        tracks_count: profile.tracks?.[0]?.count || 0,
        events_count: profile.events?.[0]?.count || 0,
        total_plays: 0, // Would need to calculate from tracks
        total_likes: 0, // Would need to calculate from tracks
      }
    })) || [];

    return { data: creators, error: null };
  } catch (error) {
    console.error('Unexpected error searching creators:', error);
    return { data: null, error };
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