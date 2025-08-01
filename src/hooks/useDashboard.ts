import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../lib/dashboard-service';
import type {
  DashboardStats,
  UserTrack,
  UserEvent,
  UserProfile,
  UserPreferences,
  FollowerData,
  AnalyticsData
} from '../lib/dashboard-service';
import { useAuth } from '../contexts/AuthContext';

export function useDashboard() {
  const { user } = useAuth();

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tracks, setTracks] = useState<UserTrack[]>([]);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [following, setFollowing] = useState<FollowerData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Load dashboard stats
  const loadDashboardStats = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingStats(true);
      setStatsError(null);

      const { data, error } = await dashboardService.getDashboardStats(user.id);

      if (error) {
        setStatsError('Failed to load dashboard stats');
        return;
      }

      setStats(data);
    } catch {
      setStatsError('Failed to load dashboard stats');
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  // Load user tracks
  const loadUserTracks = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingTracks(true);
      setTracksError(null);

      const { data, error } = await dashboardService.getUserTracks(user.id);

      if (error) {
        setTracksError('Failed to load tracks');
        return;
      }

      setTracks(data || []);
    } catch {
      setTracksError('Failed to load tracks');
    } finally {
      setIsLoadingTracks(false);
    }
  }, [user]);

  // Load user events
  const loadUserEvents = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingEvents(true);
      setEventsError(null);

      const { data, error } = await dashboardService.getUserEvents(user.id);

      if (error) {
        setEventsError('Failed to load events');
        return;
      }

      setEvents(data || []);
    } catch {
      setEventsError('Failed to load events');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user]);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingProfile(true);
      setProfileError(null);

      const { data, error } = await dashboardService.getUserProfile(user.id);

      if (error) {
        setProfileError('Failed to load profile');
        return;
      }

      setProfile(data);
    } catch {
      setProfileError('Failed to load profile');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Load user preferences
  const loadUserPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingPreferences(true);
      setPreferencesError(null);

      const { data, error } = await dashboardService.getUserPreferences(user.id);

      if (error) {
        setPreferencesError('Failed to load preferences');
        return;
      }

      setPreferences(data);
    } catch {
      setPreferencesError('Failed to load preferences');
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [user]);

  // Load followers
  const loadFollowers = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingFollowers(true);
      setFollowersError(null);

      const { data, error } = await dashboardService.getUserFollowers(user.id);

      if (error) {
        setFollowersError('Failed to load followers');
        return;
      }

      setFollowers(data || []);
    } catch {
      setFollowersError('Failed to load followers');
    } finally {
      setIsLoadingFollowers(false);
    }
  }, [user]);

  // Load following
  const loadFollowing = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await dashboardService.getUserFollowing(user.id);

      if (error) {
        console.error('Failed to load following:', error);
        return;
      }

      setFollowing(data || []);
    } catch (err) {
      console.error('Failed to load following:', err);
    }
  }, [user]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingAnalytics(true);
      setAnalyticsError(null);

      const { data, error } = await dashboardService.getAnalyticsData(user.id);

      if (error) {
        setAnalyticsError('Failed to load analytics');
        return;
      }

      setAnalytics(data);
    } catch {
      setAnalyticsError('Failed to load analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [user]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      setIsLoadingProfile(true);
      setProfileError(null);

      const { data, error } = await dashboardService.updateUserProfile(user.id, updates);

      if (error) {
        setProfileError('Failed to update profile');
        return;
      }

      setProfile(data);
      return { success: true };
    } catch {
      setProfileError('Failed to update profile');
      return { success: false };
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Update user preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      setIsLoadingPreferences(true);
      setPreferencesError(null);

      const { data, error } = await dashboardService.updateUserPreferences(user.id, updates);

      if (error) {
        setPreferencesError('Failed to update preferences');
        return;
      }

      setPreferences(data);
      return { success: true };
    } catch {
      setPreferencesError('Failed to update preferences');
      return { success: false };
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [user]);

  // Delete track
  const deleteTrack = useCallback(async (trackId: string) => {
    if (!user) return;

    try {
      const { error } = await dashboardService.deleteTrack(trackId, user.id);

      if (error) {
        setTracksError('Failed to delete track');
        return { success: false };
      }

      // Remove track from local state
      setTracks(prev => prev.filter(track => track.id !== trackId));

      // Reload stats to update counts
      await loadDashboardStats();

      return { success: true };
    } catch {
      setTracksError('Failed to delete track');
      return { success: false };
    }
  }, [user, loadDashboardStats]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await dashboardService.deleteEvent(eventId, user.id);

      if (error) {
        setEventsError('Failed to delete event');
        return { success: false };
      }

      // Remove event from local state
      setEvents(prev => prev.filter(event => event.id !== eventId));

      // Reload stats to update counts
      await loadDashboardStats();

      return { success: true };
    } catch {
      setEventsError('Failed to delete event');
      return { success: false };
    }
  }, [user, loadDashboardStats]);

  // Export user data
  const exportUserData = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await dashboardService.exportUserData(user.id);

      if (error) {
        setError('Failed to export user data');
        return;
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soundbridge-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch {
      setError('Failed to export user data');
      return { success: false };
    }
  }, [user]);

  // Delete user account
  const deleteUserAccount = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await dashboardService.deleteUserAccount(user.id);

      if (error) {
        setError('Failed to delete account');
        return { success: false };
      }

      return { success: true };
    } catch {
      setError('Failed to delete account');
      return { success: false };
    }
  }, [user]);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        loadDashboardStats(),
        loadUserTracks(),
        loadUserEvents(),
        loadUserProfile(),
        loadUserPreferences(),
        loadFollowers(),
        loadFollowing(),
        loadAnalytics(),
      ]);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [user, loadDashboardStats, loadUserTracks, loadUserEvents, loadUserProfile, loadUserPreferences, loadFollowers, loadFollowing, loadAnalytics]);

  // Initialize dashboard
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  return {
    // State
    stats,
    tracks,
    events,
    profile,
    preferences,
    followers,
    following,
    analytics,

    // Loading states
    isLoading,
    isLoadingStats,
    isLoadingTracks,
    isLoadingEvents,
    isLoadingProfile,
    isLoadingPreferences,
    isLoadingFollowers,
    isLoadingAnalytics,

    // Error states
    error,
    statsError,
    tracksError,
    eventsError,
    profileError,
    preferencesError,
    followersError,
    analyticsError,

    // Actions
    loadDashboardData,
    loadDashboardStats,
    loadUserTracks,
    loadUserEvents,
    loadUserProfile,
    loadUserPreferences,
    loadFollowers,
    loadFollowing,
    loadAnalytics,
    updateProfile,
    updatePreferences,
    deleteTrack,
    deleteEvent,
    exportUserData,
    deleteUserAccount,

    // Error setters
    setError,
    setStatsError,
    setTracksError,
    setEventsError,
    setProfileError,
    setPreferencesError,
    setFollowersError,
    setAnalyticsError,
  };
} 