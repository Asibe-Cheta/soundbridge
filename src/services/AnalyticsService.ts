// src/services/AnalyticsService.ts
import { supabase } from '../lib/supabase';

export interface CreatorAnalytics {
  stats: {
    totalPlays: number;
    totalLikes: number;
    totalShares: number;
    followers: number;
    following: number;
    tracks: number;
    events: number;
    engagementRate: number;
  };
  recentTracks: Array<{
    id: string;
    title: string;
    play_count: number;
    likes_count: number;
    created_at: string;
  }>;
  monthlyPlays: Array<{
    date: string;
    plays: number;
  }>;
  topGenre: string;
  peakListeningHours: Array<{
    hour: number;
    plays: number;
  }>;
  topCountries: Array<{
    country: string;
    plays: number;
  }>;
}

export interface CreatorRevenue {
  totalEarned: number;
  totalPaidOut: number;
  pendingBalance: number;
  availableBalance: number;
  thisMonthEarnings: number;
  totalTips: number;
  totalTrackSales: number;
  totalSubscriptions: number;
  payoutThreshold: number;
  stripeConnected: boolean;
}

export interface PlayEvent {
  trackId: string;
  duration: number;
  completed: boolean;
  skipped: boolean;
  timestamp: Date;
  deviceType: string;
  country?: string;
}

class AnalyticsService {
  private baseUrl: string;

  constructor() {
    // Use the web app's API endpoints
    this.baseUrl = 'https://soundbridge.live/api';
  }

  /**
   * Track a play event using the web app's API
   */
  async trackPlay(trackId: string, duration?: number, completed: boolean = false): Promise<void> {
    try {
      console.log('­ƒôè Tracking play event for track:', trackId);
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ÔÜá´©Å No session found, skipping analytics tracking');
        return;
      }

      // Call web app's play count API
      const response = await fetch(`${this.baseUrl}/audio/update-play-count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          trackId,
          duration: duration || 0,
          completed,
          timestamp: new Date().toISOString(),
          deviceType: 'mobile'
        }),
      });

      if (!response.ok) {
        console.error('ÔØî Failed to track play event:', response.statusText);
        return;
      }

      console.log('Ô£à Play event tracked successfully');
    } catch (error) {
      console.error('ÔØî Error tracking play event:', error);
      // Don't throw error to avoid breaking playback
    }
  }

  /**
   * Track detailed play analytics
   */
  async trackPlayAnalytics(event: PlayEvent): Promise<void> {
    try {
      console.log('­ƒôè Tracking detailed play analytics:', event);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ÔÜá´©Å No session found, skipping detailed analytics');
        return;
      }

      // Insert into analytics table directly via Supabase
      const { error } = await supabase
        .from('track_analytics')
        .insert({
          track_id: event.trackId,
          user_id: session.user.id,
          event_type: event.completed ? 'complete' : event.skipped ? 'skip' : 'play',
          duration_played: event.duration,
          device_type: event.deviceType,
          country_code: event.country,
          timestamp: event.timestamp.toISOString(),
        });

      if (error) {
        console.error('ÔØî Failed to track detailed analytics:', error);
        return;
      }

      console.log('Ô£à Detailed analytics tracked successfully');
    } catch (error) {
      console.error('ÔØî Error tracking detailed analytics:', error);
    }
  }

  /**
   * Get creator analytics from web app API
   */
  async getCreatorAnalytics(period: string = '30d'): Promise<CreatorAnalytics | null> {
    try {
      console.log('­ƒôè Fetching creator analytics for period:', period);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ÔÜá´©Å No session found, cannot fetch analytics');
        return null;
      }

      // Try web app API first
      try {
        const response = await fetch(`${this.baseUrl}/profile/analytics?period=${period}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Ô£à Analytics fetched from web app API');
          return data.analytics;
        }
      } catch (apiError) {
        console.log('ÔÜá´©Å Web app API not available, using direct database query');
      }

      // Fallback to direct database query
      return await this.getCreatorAnalyticsFromDB(session.user.id, period);
    } catch (error) {
      console.error('ÔØî Error fetching creator analytics:', error);
      return null;
    }
  }

  /**
   * Get creator analytics directly from database (fallback)
   */
  private async getCreatorAnalyticsFromDB(userId: string, period: string): Promise<CreatorAnalytics | null> {
    try {
      console.log('­ƒôè Fetching analytics from database for user:', userId);

      // Get date range based on period
      const dateRange = this.getDateRange(period);
      
      // Get basic stats
      const { data: stats } = await supabase
        .from('analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false });

      // Get track performance
      const { data: tracks } = await supabase
        .from('audio_tracks')
        .select('id, title, play_count, likes_count, created_at')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate aggregated stats
      const totalPlays = stats?.reduce((sum, stat) => sum + (stat.play_count || 0), 0) || 0;
      const totalLikes = tracks?.reduce((sum, track) => sum + (track.likes_count || 0), 0) || 0;
      const totalShares = 0; // Not tracked yet
      const followers = stats?.[0]?.follower_count || 0;
      const following = stats?.[0]?.following_count || 0;
      const tracksCount = tracks?.length || 0;
      const events = stats?.[0]?.event_attendance || 0;
      const engagementRate = totalPlays > 0 ? (totalLikes / totalPlays) * 100 : 0;

      return {
        stats: {
          totalPlays,
          totalLikes,
          totalShares,
          followers,
          following,
          tracks: tracksCount,
          events,
          engagementRate: Math.round(engagementRate * 100) / 100,
        },
        recentTracks: tracks || [],
        monthlyPlays: stats?.map(stat => ({
          date: stat.date,
          plays: stat.play_count || 0,
        })) || [],
        topGenre: 'Electronic', // TODO: Calculate from tracks
        peakListeningHours: [],
        topCountries: [],
      };
    } catch (error) {
      console.error('ÔØî Error fetching analytics from database:', error);
      return null;
    }
  }

  /**
   * Get creator revenue from web app API
   */
  async getCreatorRevenue(): Promise<CreatorRevenue | null> {
    try {
      console.log('­ƒÆ░ Fetching creator revenue');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ÔÜá´©Å No session found, cannot fetch revenue');
        return null;
      }

      // Try web app API first
      try {
        const response = await fetch(`${this.baseUrl}/user/revenue/summary`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Ô£à Revenue fetched from web app API');
          return data.revenue;
        }
      } catch (apiError) {
        console.log('ÔÜá´©Å Web app API not available, using direct database query');
      }

      // Fallback to direct database query
      return await this.getCreatorRevenueFromDB(session.user.id);
    } catch (error) {
      console.error('ÔØî Error fetching creator revenue:', error);
      return null;
    }
  }

  /**
   * Get creator revenue directly from database (fallback)
   */
  private async getCreatorRevenueFromDB(userId: string): Promise<CreatorRevenue | null> {
    try {
      console.log('­ƒÆ░ Fetching revenue from database for user:', userId);

      const { data: revenue } = await supabase
        .from('creator_revenue')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!revenue) {
        // Create initial revenue record if it doesn't exist
        const { data: newRevenue } = await supabase
          .from('creator_revenue')
          .insert({
            user_id: userId,
            total_earned: 0,
            total_paid_out: 0,
            pending_balance: 0,
            available_balance: 0,
            payout_threshold: 50,
            stripe_connected: false,
          })
          .select()
          .single();

        return newRevenue ? {
          totalEarned: newRevenue.total_earned || 0,
          totalPaidOut: newRevenue.total_paid_out || 0,
          pendingBalance: newRevenue.pending_balance || 0,
          availableBalance: newRevenue.available_balance || 0,
          thisMonthEarnings: 0, // TODO: Calculate from transactions
          totalTips: 0, // TODO: Calculate from tips
          totalTrackSales: 0, // TODO: Calculate from sales
          totalSubscriptions: 0, // TODO: Calculate from subscriptions
          payoutThreshold: newRevenue.payout_threshold || 50,
          stripeConnected: newRevenue.stripe_connected || false,
        } : null;
      }

      return {
        totalEarned: revenue.total_earned || 0,
        totalPaidOut: revenue.total_paid_out || 0,
        pendingBalance: revenue.pending_balance || 0,
        availableBalance: revenue.available_balance || 0,
        thisMonthEarnings: 0, // TODO: Calculate from transactions
        totalTips: 0, // TODO: Calculate from tips
        totalTrackSales: 0, // TODO: Calculate from sales
        totalSubscriptions: 0, // TODO: Calculate from subscriptions
        payoutThreshold: revenue.payout_threshold || 50,
        stripeConnected: revenue.stripe_connected || false,
      };
    } catch (error) {
      console.error('ÔØî Error fetching revenue from database:', error);
      return null;
    }
  }

  /**
   * Track engagement events (likes, shares, follows)
   */
  async trackEngagement(contentId: string, contentType: 'track' | 'event' | 'profile', action: 'like' | 'share' | 'follow'): Promise<void> {
    try {
      console.log('­ƒôè Tracking engagement:', { contentId, contentType, action });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ÔÜá´©Å No session found, skipping engagement tracking');
        return;
      }

      // Insert into appropriate table
      const tableName = action === 'like' ? 'likes' : 
                      action === 'share' ? 'shares' : 
                      action === 'follow' ? 'follows' : null;

      if (!tableName) {
        console.error('ÔØî Invalid engagement action:', action);
        return;
      }

      const { error } = await supabase
        .from(tableName)
        .insert({
          user_id: session.user.id,
          content_id: contentId,
          content_type: contentType,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('ÔØî Failed to track engagement:', error);
        return;
      }

      console.log('Ô£à Engagement tracked successfully');
    } catch (error) {
      console.error('ÔØî Error tracking engagement:', error);
    }
  }

  /**
   * Get analytics for a specific track
   */
  async getTrackAnalytics(trackId: string, period: string = '30d'): Promise<any> {
    try {
      console.log('­ƒôè Fetching track analytics for:', trackId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ÔÜá´©Å No session found, cannot fetch track analytics');
        return null;
      }

      const dateRange = this.getDateRange(period);

      const { data: analytics } = await supabase
        .from('track_analytics')
        .select('*')
        .eq('track_id', trackId)
        .gte('timestamp', dateRange.start)
        .lte('timestamp', dateRange.end)
        .order('timestamp', { ascending: false });

      return analytics;
    } catch (error) {
      console.error('ÔØî Error fetching track analytics:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToAnalyticsUpdates(userId: string, callback: (payload: any) => void) {
    console.log('­ƒôè Subscribing to analytics updates for user:', userId);

    return supabase
      .channel('analytics-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analytics',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'creator_revenue',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  /**
   * Helper function to get date range based on period
   */
  private getDateRange(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    
    let start: string;
    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    return { start, end };
  }
}

export default new AnalyticsService();
