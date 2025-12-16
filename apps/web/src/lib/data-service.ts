/**
 * Data Service - Direct Supabase Client Queries
 *
 * This service provides direct database access for all read operations.
 * Modeled after the mobile app's dbHelpers pattern which achieves 1-3s load times.
 *
 * Benefits:
 * - No API route overhead (5-10s faster)
 * - Direct Supabase connection
 * - Proven in production on mobile app
 * - Security via Row Level Security (RLS)
 */

import { createBrowserClient } from './supabase';

class DataService {
  private supabase = createBrowserClient();

  /**
   * Get trending audio tracks
   * @param limit Number of tracks to fetch (default: 10)
   * @returns { data, error }
   */
  async getTrendingTracks(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          artist_name,
          cover_art_url,
          file_url,
          duration,
          play_count,
          like_count,
          creator_id,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'in', '("podcast","Podcast","PODCAST")')
        .order('play_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trending tracks:', error);
        return { data: [], error };
      }

      // Format tracks for frontend
      const formattedTracks = (data || []).map(track => ({
        id: track.id,
        title: track.title,
        artist: track.creator?.display_name || track.artist_name || 'Unknown Artist',
        coverArt: track.cover_art_url,
        url: track.file_url,
        duration: track.duration || 0,
        plays: track.play_count || 0,
        likes: track.like_count || 0,
        creator: {
          id: track.creator_id,
          name: track.creator?.display_name || track.artist_name || 'Unknown Artist',
          username: track.creator?.username || 'unknown',
          avatar: track.creator?.avatar_url || null
        }
      }));

      return { data: formattedTracks, error: null };
    } catch (error) {
      console.error('Unexpected error fetching trending tracks:', error);
      return { data: [], error };
    }
  }

  /**
   * Get featured creators
   * @param limit Number of creators to fetch (default: 6)
   * @returns { data, error }
   */
  async getFeaturedCreators(limit = 6) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url, banner_url, location, country')
        .eq('role', 'creator')
        .not('display_name', 'is', null)
        .not('bio', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to shuffle

      if (error) {
        console.error('Error fetching featured creators:', error);
        return { data: [], error };
      }

      // Shuffle creators for variety
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return { data: shuffled.slice(0, limit), error: null };
    } catch (error) {
      console.error('Unexpected error fetching featured creators:', error);
      return { data: [], error };
    }
  }

  /**
   * Get feed posts
   * @param page Page number (default: 1)
   * @param limit Posts per page (default: 15)
   * @returns { data, error, hasMore }
   */
  async getFeedPosts(page = 1, limit = 15) {
    try {
      const offset = (page - 1) * limit;

      // First get the posts
      const { data: posts, error: postsError } = await this.supabase
        .from('posts')
        .select('*')
        .is('deleted_at', null)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return { data: [], error: postsError, hasMore: false };
      }

      if (!posts || posts.length === 0) {
        return { data: [], error: null, hasMore: false };
      }

      // Then get the authors separately
      const userIds = [...new Set(posts.map((p: any) => p.user_id))];
      const { data: authors } = await this.supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, location')
        .in('id', userIds);

      // Map authors to posts
      const authorsMap = new Map((authors || []).map((a: any) => [a.id, a]));
      const postsWithAuthors = posts.map((post: any) => ({
        ...post,
        author: authorsMap.get(post.user_id) || {
          id: post.user_id,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null,
          role: null,
          location: null
        }
      }));

      return {
        data: postsWithAuthors,
        error: null,
        hasMore: posts.length === limit,
      };
    } catch (error) {
      console.error('Unexpected error fetching feed posts:', error);
      return { data: [], error, hasMore: false };
    }
  }

  /**
   * Get connection suggestions for a user
   * @param userId Current user ID
   * @param limit Number of suggestions (default: 10)
   * @returns { data, error }
   */
  async getConnectionSuggestions(userId: string, limit = 10) {
    try {
      // Get users this person already follows
      const { data: following } = await this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followingIds = following?.map(f => f.following_id) || [];

      // Build query for suggestions
      let query = this.supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url, followers_count, location')
        .neq('id', userId)
        .order('followers_count', { ascending: false })
        .limit(limit);

      // Exclude already followed users
      if (followingIds.length > 0) {
        query = query.not('id', 'in', `(${followingIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching connection suggestions:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Unexpected error fetching connection suggestions:', error);
      return { data: [], error };
    }
  }

  /**
   * Get album details with tracks
   * @param albumId Album ID
   * @returns { data, error }
   */
  async getAlbumDetails(albumId: string) {
    try {
      // Get album with creator
      const { data: album, error: albumError } = await this.supabase
        .from('albums')
        .select(`
          *,
          creator:profiles!albums_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', albumId)
        .single();

      if (albumError) {
        console.error('Error fetching album:', albumError);
        return { data: null, error: albumError };
      }

      // Get album tracks
      const { data: albumTracks, error: tracksError } = await this.supabase
        .from('album_tracks')
        .select(`
          track_number,
          track_id,
          audio_tracks(
            id,
            title,
            artist_name,
            duration,
            file_url,
            cover_art_url,
            play_count,
            like_count
          )
        `)
        .eq('album_id', albumId)
        .order('track_number', { ascending: true });

      if (tracksError) {
        console.error('Error fetching album tracks:', tracksError);
        return { data: null, error: tracksError };
      }

      return {
        data: {
          ...album,
          tracks: (albumTracks || []).map(at => ({
            ...(at.audio_tracks as any),
            track_number: at.track_number,
          })),
        },
        error: null,
      };
    } catch (error) {
      console.error('Unexpected error fetching album details:', error);
      return { data: null, error };
    }
  }

  /**
   * Get playlist details with tracks
   * @param playlistId Playlist ID
   * @returns { data, error }
   */
  async getPlaylistDetails(playlistId: string) {
    try {
      // Get playlist with creator
      const { data: playlist, error: playlistError } = await this.supabase
        .from('playlists')
        .select(`
          *,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('id', playlistId)
        .single();

      if (playlistError) {
        console.error('Error fetching playlist:', playlistError);
        return { data: null, error: playlistError };
      }

      // Get playlist tracks
      const { data: playlistTracks, error: tracksError } = await this.supabase
        .from('playlist_tracks')
        .select(`
          position,
          track_id,
          audio_tracks(
            id,
            title,
            artist_name,
            duration,
            file_url,
            cover_art_url,
            play_count,
            like_count,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name
            )
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (tracksError) {
        console.error('Error fetching playlist tracks:', tracksError);
        return { data: null, error: tracksError };
      }

      return {
        data: {
          ...playlist,
          tracks: (playlistTracks || []).map(pt => ({
            ...(pt.audio_tracks as any),
            position: pt.position,
          })),
        },
        error: null,
      };
    } catch (error) {
      console.error('Unexpected error fetching playlist details:', error);
      return { data: null, error };
    }
  }

  /**
   * Get creator profile with stats
   * @param username Creator username
   * @returns { data, error }
   */
  async getCreatorProfile(username: string) {
    try {
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) {
        console.error('Error fetching creator profile:', profileError);
        return { data: null, error: profileError };
      }

      // Get creator's tracks
      const { data: tracks } = await this.supabase
        .from('audio_tracks')
        .select('id, title, cover_art_url, play_count, like_count')
        .eq('creator_id', profile.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get creator's albums
      const { data: albums } = await this.supabase
        .from('albums')
        .select('id, title, cover_url, is_public')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        data: {
          ...profile,
          tracks: tracks || [],
          albums: albums || [],
        },
        error: null,
      };
    } catch (error) {
      console.error('Unexpected error fetching creator profile:', error);
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const dataService = new DataService();
