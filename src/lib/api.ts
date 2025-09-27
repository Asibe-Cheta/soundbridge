import { supabase } from './supabase';

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: any;
}

// Track-related types
export interface Track {
  id: string;
  title: string;
  description?: string;
  file_url: string; // This is the actual column name in database
  cover_art_url?: string; // This is the actual column name in database
  duration?: number;
  play_count: number; // This is the actual column name in database
  like_count: number; // This is the actual column name in database
  genre?: string;
  tags?: string[];
  is_public: boolean;
  created_at: string;
  updated_at?: string;
  creator_id: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

// User profile types
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  role: 'listener' | 'creator' | 'artist' | 'producer';
  location?: string;
  country?: string;
  genre?: string;
  followers_count: number;
  following_count: number;
  total_plays: number;
  total_likes: number;
  total_events: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Event types
export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  venue?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  image_url?: string;
  creator_id: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  created_at: string;
}

// API Service Class
export class APIService {
  
  // ============ TRACKS API ============
  
  /**
   * Get trending tracks
   */
  async getTrendingTracks(limit: number = 20): Promise<ApiResponse<Track[]>> {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST')
        .order('play_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching trending tracks:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Get recent tracks
   */
  async getRecentTracks(limit: number = 20): Promise<ApiResponse<Track[]>> {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching recent tracks:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Get tracks by creator
   */
  async getTracksByCreator(creatorId: string, limit: number = 50): Promise<ApiResponse<Track[]>> {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('creator_id', creatorId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching creator tracks:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Search tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<ApiResponse<Track[]>> {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .or(`title.ilike.%${query}%, description.ilike.%${query}%, genre.ilike.%${query}%`)
        .order('plays_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error searching tracks:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Get track by ID
   */
  async getTrackById(trackId: string): Promise<ApiResponse<Track>> {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', trackId)
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error fetching track:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Increment track play count
   */
  async incrementPlayCount(trackId: string): Promise<ApiResponse<void>> {
    try {
      // Update play count directly since we may not have the RPC function
      const { error } = await supabase
        .from('audio_tracks')
        .update({ 
          play_count: supabase.raw('play_count + 1') 
        })
        .eq('id', trackId);

      if (error) throw error;

      return { success: true, data: null, error: null };
    } catch (error) {
      console.error('Error incrementing play count:', error);
      return { success: false, data: null, error };
    }
  }

  // ============ PROFILES API ============

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Get user profile by username
   */
  async getProfileByUsername(username: string): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error fetching profile by username:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Create user profile (called after signup)
   */
  async createProfile(userId: string, profileData: {
    username: string;
    display_name: string;
    user_type?: 'listener' | 'creator' | 'artist' | 'producer';
    bio?: string;
  }): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: profileData.username,
          display_name: profileData.display_name,
          user_type: profileData.user_type || 'listener',
          bio: profileData.bio || null,
          followers_count: 0,
          following_count: 0,
          tracks_count: 0,
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error creating profile:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailable(username: string): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      // If no data found, username is available
      const isAvailable = !data;

      return { success: true, data: isAvailable, error: null };
    } catch (error) {
      // If error is because no rows found, username is available
      if (error.code === 'PGRST116') {
        return { success: true, data: true, error: null };
      }
      console.error('Error checking username:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Get hot/featured creators using the same algorithm as web app
   */
  async getHotCreators(limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    try {
      // Use the same algorithm as the web app for hot creators
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          genre,
          role,
          followers_count,
          following_count,
          total_plays,
          total_likes,
          total_events,
          is_public,
          created_at,
          updated_at
        `)
        .eq('role', 'creator')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('total_plays', { ascending: false })
        .order('followers_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching hot creators:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Search creators
   */
  async searchCreators(query: string, limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%, display_name.ilike.%${query}%, bio.ilike.%${query}%`)
        .order('followers_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error searching creators:', error);
      return { success: false, data: null, error };
    }
  }

  // ============ EVENTS API ============

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 20): Promise<ApiResponse<Event[]>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gte('event_date', new Date().toISOString())
        .order('current_attendees', { ascending: false })
        .order('event_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Search events
   */
  async searchEvents(query: string, limit: number = 20): Promise<ApiResponse<Event[]>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${query}%, description.ilike.%${query}%, location.ilike.%${query}%`)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('Error searching events:', error);
      return { success: false, data: null, error };
    }
  }

  // ============ SOCIAL FEATURES API ============

  /**
   * Like a track
   */
  async likeTrack(trackId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('track_likes')
        .insert({
          track_id: trackId,
          user_id: userId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update track likes count
      await supabase.rpc('increment_track_likes', { track_id: trackId });

      return { success: true, data: null, error: null };
    } catch (error) {
      console.error('Error liking track:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Unlike a track
   */
  async unlikeTrack(trackId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('track_likes')
        .delete()
        .eq('track_id', trackId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update track likes count
      await supabase.rpc('decrement_track_likes', { track_id: trackId });

      return { success: true, data: null, error: null };
    } catch (error) {
      console.error('Error unliking track:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Follow a user
   */
  async followUser(followeeId: string, followerId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          followee_id: followeeId,
          follower_id: followerId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update follower counts
      await supabase.rpc('increment_follower_count', { user_id: followeeId });
      await supabase.rpc('increment_following_count', { user_id: followerId });

      return { success: true, data: null, error: null };
    } catch (error) {
      console.error('Error following user:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followeeId: string, followerId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('followee_id', followeeId)
        .eq('follower_id', followerId);

      if (error) throw error;

      // Update follower counts
      await supabase.rpc('decrement_follower_count', { user_id: followeeId });
      await supabase.rpc('decrement_following_count', { user_id: followerId });

      return { success: true, data: null, error: null };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return { success: false, data: null, error };
    }
  }

  /**
   * Get user's liked tracks
   */
  async getUserLikedTracks(userId: string, limit: number = 50): Promise<ApiResponse<Track[]>> {
    try {
      const { data, error } = await supabase
        .from('track_likes')
        .select(`
          audio_tracks!inner(
            *,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Extract tracks from the join result
      const tracks = data?.map(item => item.audio_tracks).filter(Boolean) || [];

      return { success: true, data: tracks, error: null };
    } catch (error) {
      console.error('Error fetching liked tracks:', error);
      return { success: false, data: null, error };
    }
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Get general feed for home screen with fallback to sample data
   */
  async getHomeFeed(userId?: string, limit: number = 20): Promise<ApiResponse<{
    trending: Track[];
    recent: Track[];
    hotCreators: UserProfile[];
    upcomingEvents: Event[];
  }>> {
    try {
      console.log('🏠 Loading home feed from database...');
      
      const [trending, recent, hotCreators, upcomingEvents] = await Promise.all([
        this.getTrendingTracks(limit / 2),
        this.getRecentTracks(limit / 2),
        this.getHotCreators(10),
        this.getUpcomingEvents(5)
      ]);

      const feedData = {
        trending: trending.data || [],
        recent: recent.data || [],
        hotCreators: hotCreators.data || [],
        upcomingEvents: upcomingEvents.data || []
      };

      // Log what we actually got from the database
      console.log('📊 Database results:', {
        trending: feedData.trending.length,
        recent: feedData.recent.length,
        hotCreators: feedData.hotCreators.length,
        upcomingEvents: feedData.upcomingEvents.length
      });

      // If we have real data, use it
      const hasRealData = feedData.trending.length > 0 || 
                         feedData.recent.length > 0 || 
                         feedData.hotCreators.length > 0 || 
                         feedData.upcomingEvents.length > 0;

      if (hasRealData) {
        console.log('✅ Using real data from database');
        return {
          success: true,
          data: feedData,
          error: null
        };
      } else {
        console.log('⚠️ No real data found, check your database tables and data');
        // Return empty arrays for now - user needs to add real data
        return {
          success: true,
          data: {
            trending: [],
            recent: [],
            hotCreators: [],
            upcomingEvents: []
          },
          error: null
        };
      }
    } catch (error) {
      console.error('Error fetching home feed:', error);
      return { success: false, data: null, error };
    }
  }
}

// Export singleton instance
export const apiService = new APIService();
