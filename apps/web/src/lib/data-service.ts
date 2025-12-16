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

  /**
   * Get connection requests for a user
   * @param userId Current user ID
   * @param type Request type: 'sent' or 'received'
   * @returns { data, error }
   */
  async getConnectionRequests(userId: string, type: 'sent' | 'received' = 'received') {
    try {
      // FIXED: Column is 'recipient_id' not 'receiver_id'
      const column = type === 'sent' ? 'requester_id' : 'recipient_id';

      // Get connection requests
      const { data: requests, error: requestsError } = await this.supabase
        .from('connection_requests')
        .select('*')
        .eq(column, userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching connection requests:', requestsError);
        return { data: [], error: requestsError };
      }

      if (!requests || requests.length === 0) {
        return { data: [], error: null };
      }

      // Get profiles for requesters/recipients
      // FIXED: Column is 'recipient_id' not 'receiver_id'
      const profileColumn = type === 'sent' ? 'recipient_id' : 'requester_id';
      const profileIds = [...new Set(requests.map((r: any) => r[profileColumn]))];

      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, location, bio')
        .in('id', profileIds);

      // Map profiles to requests
      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const formattedRequests = requests.map((request: any) => {
        const profile = profilesMap.get(request[profileColumn]);
        return {
          id: request.id,
          user: {
            id: profile?.id || request[profileColumn],
            name: profile?.display_name || 'Unknown User',
            username: profile?.username || 'unknown',
            avatar_url: profile?.avatar_url || null,
            role: profile?.role || null,
            location: profile?.location || null
          },
          message: request.message || '',
          created_at: request.created_at,
          status: request.status
        };
      });

      return { data: formattedRequests, error: null };
    } catch (error) {
      console.error('Unexpected error fetching connection requests:', error);
      return { data: [], error };
    }
  }

  /**
   * Get opportunity posts
   * @param limit Number of opportunities (default: 15)
   * @returns { data, error }
   */
  async getOpportunities(limit = 15) {
    try {
      // FIXED: Use 'post_type' not 'tags' - posts table doesn't have a tags column
      const { data: posts, error: postsError } = await this.supabase
        .from('posts')
        .select('*')
        .is('deleted_at', null)
        .eq('visibility', 'public')
        .eq('post_type', 'opportunity')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (postsError) {
        console.error('Error fetching opportunities:', postsError);
        return { data: [], error: postsError };
      }

      if (!posts || posts.length === 0) {
        return { data: [], error: null };
      }

      // Get authors separately
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

      return { data: postsWithAuthors, error: null };
    } catch (error) {
      console.error('Unexpected error fetching opportunities:', error);
      return { data: [], error };
    }
  }

  /**
   * Get user's connections (followers/following)
   * @param userId Current user ID
   * @param type Connection type: 'followers' or 'following'
   * @param limit Number of connections (default: 50)
   * @returns { data, error }
   */
  async getConnections(userId: string, type: 'followers' | 'following' = 'following', limit = 50) {
    try {
      const column = type === 'followers' ? 'following_id' : 'follower_id';
      const targetColumn = type === 'followers' ? 'follower_id' : 'following_id';

      // Get follows
      const { data: follows, error: followsError } = await this.supabase
        .from('follows')
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (followsError) {
        console.error('Error fetching connections:', followsError);
        return { data: [], error: followsError };
      }

      if (!follows || follows.length === 0) {
        return { data: [], error: null };
      }

      // Get profiles for connections
      const profileIds = [...new Set(follows.map((f: any) => f[targetColumn]))];
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, location, bio, followers_count')
        .in('id', profileIds);

      // Map profiles to follows
      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const formattedConnections = follows.map((follow: any) => {
        const profile = profilesMap.get(follow[targetColumn]);
        return {
          id: follow.id,
          user: {
            id: profile?.id || follow[targetColumn],
            name: profile?.display_name || 'Unknown User',
            username: profile?.username || 'unknown',
            avatar_url: profile?.avatar_url || null,
            role: profile?.role || null,
            location: profile?.location || null,
            bio: profile?.bio || ''
          },
          followers_count: profile?.followers_count || 0,
          created_at: follow.created_at
        };
      });

      return { data: formattedConnections, error: null };
    } catch (error) {
      console.error('Unexpected error fetching connections:', error);
      return { data: [], error };
    }
  }

  /**
   * Get profile with stats - Mobile team's approach
   * Loads profile + tracks in parallel, then calculates stats CLIENT-SIDE
   * @param userId User ID
   * @returns { data: { profile, stats, tracks, albums, playlists }, error }
   */
  async getProfileWithStats(userId: string) {
    try {
      console.log('🚀 Loading profile with stats using mobile approach...');
      const startTime = Date.now();

      // Run all queries in PARALLEL (mobile team's approach)
      const [
        profileResult,
        tracksResult,
        followersResult,
        followingResult,
      ] = await Promise.all([
        // 1. Profile data
        this.supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),

        // 2. User's tracks (with play counts and likes)
        this.supabase
          .from('audio_tracks')
          .select('id, title, play_count, likes_count, created_at, cover_art_url, duration, file_url, artist')
          .eq('creator_id', userId)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50), // Limit to recent 50 tracks for performance

        // 3. Followers count
        this.supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId),

        // 4. Following count
        this.supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);

      console.log(`✅ All queries completed in ${Date.now() - startTime}ms`);

      // Extract data
      const profile = profileResult.data;
      const tracks = tracksResult.data || [];
      const followersCount = followersResult.count || 0;
      const followingCount = followingResult.count || 0;

      // Calculate stats from tracks (CLIENT-SIDE - mobile team's approach)
      console.log('🔢 Calculating stats from track data...');
      const totalPlays = tracks.reduce((sum, track) => sum + (track.play_count || 0), 0);
      const totalLikes = tracks.reduce((sum, track) => sum + (track.likes_count || 0), 0);

      // Format tracks for display
      const formattedTracks = tracks.slice(0, 10).map((track: any) => ({
        id: track.id,
        title: track.title,
        duration: track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : '0:00',
        plays: track.play_count || 0,
        likes: track.likes_count || 0,
        uploadedAt: new Date(track.created_at).toLocaleDateString(),
        coverArt: track.cover_art_url,
        fileUrl: track.file_url,
        artist: track.artist
      }));

      const stats = {
        totalPlays,
        totalLikes,
        totalShares: 0, // Not tracked in audio_tracks table
        totalDownloads: 0, // Not tracked in audio_tracks table
        followers: followersCount,
        following: followingCount,
        tracks: tracks.length,
        events: 0, // Would need separate query if needed
      };

      // Analytics data (estimates)
      const monthlyPlays = Math.floor(totalPlays * 0.3); // Estimate ~30% of total
      const engagementRate = totalPlays > 0 ? Math.round((totalLikes / totalPlays) * 100) : 0;

      console.log(`✅ Profile with stats loaded in ${Date.now() - startTime}ms`);
      console.log('📊 Stats calculated:', stats);

      return {
        data: {
          profile,
          stats,
          tracks: formattedTracks,
          analyticsData: {
            monthlyPlays,
            engagementRate,
            topGenre: profile?.genres?.[0] || 'No tracks yet',
            monthlyPlaysChange: 0, // Would need historical data
            engagementRateChange: 0, // Would need historical data
          }
        },
        error: null,
      };
    } catch (error) {
      console.error('Error loading profile with stats:', error);
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const dataService = new DataService();
