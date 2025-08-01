import { createBrowserClient } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface DashboardStats {
  totalPlays: number;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
  totalTracks: number;
  totalEvents: number;
  monthlyGrowth: {
    plays: number;
    followers: number;
    likes: number;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'track_upload' | 'event_created' | 'follower_gained' | 'play_milestone' | 'like_milestone';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserTrack {
  id: string;
  title: string;
  description: string;
  file_url: string;
  cover_art_url?: string;
  duration: number;
  genre: string;
  play_count: number;
  like_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  venue?: string;
  category: string;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees: number;
  image_url?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  role: string;
  location?: string;
  country?: string;
  social_links?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  notification_radius_km: number;
  email_notifications: boolean;
  push_notifications: boolean;
  event_notifications: boolean;
  creator_notifications: boolean;
  message_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  language: string;
  timezone: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FollowerData {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  created_at: string;
}

export interface AnalyticsData {
  playsOverTime: { date: string; plays: number }[];
  followersOverTime: { date: string; followers: number }[];
  topTracks: { track: UserTrack; plays: number }[];
  topEvents: { event: UserEvent; attendees: number }[];
  engagementRate: number;
  averagePlaysPerTrack: number;
  conversionRate: number;
}

export class DashboardService {
  private supabase = createBrowserClient();

  /**
   * Get comprehensive dashboard stats for a user
   */
  async getDashboardStats(userId: string): Promise<{ data: DashboardStats | null; error: unknown }> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { data: null, error: profileError };
      }

      // Get user's tracks
      const { data: tracks, error: tracksError } = await this.supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', userId);

      if (tracksError) {
        console.error('Error fetching tracks:', tracksError);
        return { data: null, error: tracksError };
      }

      // Get user's events
      const { data: events, error: eventsError } = await this.supabase
        .from('events')
        .select('*')
        .eq('creator_id', userId);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return { data: null, error: eventsError };
      }

      // Get follower count
      const { count: followersCount, error: followersError } = await this.supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (followersError) {
        console.error('Error fetching followers:', followersError);
        return { data: null, error: followersError };
      }

      // Get following count
      const { count: followingCount, error: followingError } = await this.supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (followingError) {
        console.error('Error fetching following:', followingError);
        return { data: null, error: followingError };
      }

      // Calculate stats
      const totalPlays = tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0;
      const totalLikes = tracks?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;
      const totalTracks = tracks?.length || 0;
      const totalEvents = events?.length || 0;

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId);

      // Calculate monthly growth (simplified - in real app, you'd compare with previous month)
      const monthlyGrowth = {
        plays: Math.floor(totalPlays * 0.1), // 10% growth for demo
        followers: Math.floor((followersCount || 0) * 0.05), // 5% growth for demo
        likes: Math.floor(totalLikes * 0.08), // 8% growth for demo
      };

      const stats: DashboardStats = {
        totalPlays,
        totalLikes,
        totalFollowers: followersCount || 0,
        totalFollowing: followingCount || 0,
        totalTracks,
        totalEvents,
        monthlyGrowth,
        recentActivity: recentActivity.data || [],
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Unexpected error getting dashboard stats:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's tracks with management options
   */
  async getUserTracks(userId: string): Promise<{ data: UserTrack[] | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tracks:', error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Unexpected error getting user tracks:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's events with management options
   */
  async getUserEvents(userId: string): Promise<{ data: UserEvent[] | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('creator_id', userId)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error fetching user events:', error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Unexpected error getting user events:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user profile data
   */
  async getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error getting user profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error updating user profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<{ data: UserPreferences | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user preferences:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error getting user preferences:', error);
      return { data: null, error };
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<{ data: UserPreferences | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user preferences:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error updating user preferences:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's followers
   */
  async getUserFollowers(userId: string): Promise<{ data: FollowerData[] | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('follows')
        .select(`
          follower:profiles!follows_follower_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            bio,
            role,
            created_at
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user followers:', error);
        return { data: null, error };
      }

      const followers = data?.map(item => ({
        id: (item.follower as Record<string, unknown>).id as string,
        username: (item.follower as Record<string, unknown>).username as string,
        display_name: (item.follower as Record<string, unknown>).display_name as string,
        avatar_url: (item.follower as Record<string, unknown>).avatar_url as string | undefined,
        bio: (item.follower as Record<string, unknown>).bio as string | undefined,
        role: (item.follower as Record<string, unknown>).role as string,
        created_at: (item.follower as Record<string, unknown>).created_at as string,
      })) || [];

      return { data: followers, error: null };
    } catch (error) {
      console.error('Unexpected error getting user followers:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's following
   */
  async getUserFollowing(userId: string): Promise<{ data: FollowerData[] | null; error: unknown }> {
    try {
      const { data, error } = await this.supabase
        .from('follows')
        .select(`
          following:profiles!follows_following_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            bio,
            role,
            created_at
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user following:', error);
        return { data: null, error };
      }

      const following = data?.map(item => ({
        id: (item.following as Record<string, unknown>).id as string,
        username: (item.following as Record<string, unknown>).username as string,
        display_name: (item.following as Record<string, unknown>).display_name as string,
        avatar_url: (item.following as Record<string, unknown>).avatar_url as string | undefined,
        bio: (item.following as Record<string, unknown>).bio as string | undefined,
        role: (item.following as Record<string, unknown>).role as string,
        created_at: (item.following as Record<string, unknown>).created_at as string,
      })) || [];

      return { data: following, error: null };
    } catch (error) {
      console.error('Unexpected error getting user following:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a track
   */
  async deleteTrack(trackId: string, userId: string): Promise<{ error: unknown }> {
    try {
      // Verify user owns the track
      const { data: track, error: fetchError } = await this.supabase
        .from('audio_tracks')
        .select('creator_id')
        .eq('id', trackId)
        .single();

      if (fetchError || !track) {
        return { error: 'Track not found' };
      }

      if (track.creator_id !== userId) {
        return { error: 'Unauthorized' };
      }

      const { error } = await this.supabase
        .from('audio_tracks')
        .delete()
        .eq('id', trackId);

      if (error) {
        console.error('Error deleting track:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error deleting track:', error);
      return { error };
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, userId: string): Promise<{ error: unknown }> {
    try {
      // Verify user owns the event
      const { data: event, error: fetchError } = await this.supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (fetchError || !event) {
        return { error: 'Event not found' };
      }

      if (event.creator_id !== userId) {
        return { error: 'Unauthorized' };
      }

      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error deleting event:', error);
      return { error };
    }
  }

  /**
   * Get analytics data
   */
  async getAnalyticsData(userId: string): Promise<{ data: AnalyticsData | null; error: unknown }> {
    try {
      // Get user's tracks for analytics
      const { data: tracks, error: tracksError } = await this.supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', userId)
        .order('play_count', { ascending: false });

      if (tracksError) {
        console.error('Error fetching tracks for analytics:', tracksError);
        return { data: null, error: tracksError };
      }

      // Get user's events for analytics
      const { data: events, error: eventsError } = await this.supabase
        .from('events')
        .select('*')
        .eq('creator_id', userId)
        .order('current_attendees', { ascending: false });

      if (eventsError) {
        console.error('Error fetching events for analytics:', eventsError);
        return { data: null, error: eventsError };
      }

      // Calculate analytics (simplified for demo)
      const totalPlays = tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0;
      const totalLikes = tracks?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;
      const totalTracks = tracks?.length || 0;

      const engagementRate = totalTracks > 0 ? (totalLikes / totalPlays) * 100 : 0;
      const averagePlaysPerTrack = totalTracks > 0 ? totalPlays / totalTracks : 0;
      const conversionRate = totalPlays > 0 ? (totalLikes / totalPlays) * 100 : 0;

      // Generate mock time series data
      const playsOverTime = this.generateTimeSeriesData(totalPlays, 30);
      const followersOverTime = this.generateTimeSeriesData(100, 30); // Mock follower data

      const topTracks = tracks?.slice(0, 5).map(track => ({
        track,
        plays: track.play_count || 0,
      })) || [];

      const topEvents = events?.slice(0, 5).map(event => ({
        event,
        attendees: event.current_attendees || 0,
      })) || [];

      const analyticsData: AnalyticsData = {
        playsOverTime,
        followersOverTime: followersOverTime.map(item => ({
          date: item.date,
          followers: item.plays // Map plays to followers for now
        })),
        topTracks,
        topEvents,
        engagementRate,
        averagePlaysPerTrack,
        conversionRate,
      };

      return { data: analyticsData, error: null };
    } catch (error) {
      console.error('Unexpected error getting analytics data:', error);
      return { data: null, error };
    }
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(userId: string): Promise<{ data: ActivityItem[] | null; error: unknown }> {
    try {
      // Get recent tracks
      const { data: recentTracks, error: tracksError } = await this.supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (tracksError) {
        console.error('Error fetching recent tracks:', tracksError);
        return { data: null, error: tracksError };
      }

      // Get recent events
      const { data: recentEvents, error: eventsError } = await this.supabase
        .from('events')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (eventsError) {
        console.error('Error fetching recent events:', eventsError);
        return { data: null, error: eventsError };
      }

      // Combine and format activity
      const activities: ActivityItem[] = [];

      recentTracks?.forEach(track => {
        activities.push({
          id: track.id,
          type: 'track_upload',
          title: `Uploaded "${track.title}"`,
          description: `New track uploaded to your profile`,
          timestamp: track.created_at,
          metadata: { track },
        });
      });

      recentEvents?.forEach(event => {
        activities.push({
          id: event.id,
          type: 'event_created',
          title: `Created "${event.title}"`,
          description: `New event scheduled for ${new Date(event.event_date).toLocaleDateString()}`,
          timestamp: event.created_at,
          metadata: { event },
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return { data: activities.slice(0, 10), error: null };
    } catch (error) {
      console.error('Unexpected error getting recent activity:', error);
      return { data: null, error };
    }
  }

  /**
   * Generate mock time series data
   */
  private generateTimeSeriesData(totalValue: number, days: number): { date: string; plays: number }[] {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Generate realistic daily values
      const dailyValue = Math.floor(Math.random() * (totalValue / days) * 2);

      data.push({
        date: date.toISOString().split('T')[0],
        plays: dailyValue,
      });
    }

    return data;
  }

  /**
   * Export user data
   */
  async exportUserData(userId: string): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
    try {
      // Get all user data
      const [profile, tracks, events, preferences] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserTracks(userId),
        this.getUserEvents(userId),
        this.getUserPreferences(userId),
      ]);

      if (profile.error || tracks.error || events.error || preferences.error) {
        return { data: null, error: 'Failed to fetch user data' };
      }

      const exportData = {
        profile: profile.data,
        tracks: tracks.data,
        events: events.data,
        preferences: preferences.data,
        exportDate: new Date().toISOString(),
      };

      return { data: exportData, error: null };
    } catch (error) {
      console.error('Unexpected error exporting user data:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete user account
   */
  async deleteUserAccount(userId: string): Promise<{ error: unknown }> {
    try {
      // This would typically be handled by Supabase Auth
      // For now, we'll just delete the profile
      const { error } = await this.supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user account:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error deleting user account:', error);
      return { error };
    }
  }
}

export const dashboardService = new DashboardService(); 