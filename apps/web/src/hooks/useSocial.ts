import { useState, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { socialService } from '@/src/lib/social-service';
import {
  Comment,
  Like,
  Share,
  Bookmark,
  Playlist,
  Collaboration,
  Notification,
  FeedItem,
  SocialStats,
  CreateCommentRequest,
  CreateLikeRequest,
  CreateShareRequest,
  CreateBookmarkRequest,
  CreatePlaylistRequest,
  AddTrackToPlaylistRequest,
  CreateCollaborationRequest,
  UpdateCollaborationRequest,
  CommentFilters,
  PlaylistFilters,
  CollaborationFilters,
  FeedFilters
} from '@/src/lib/types/social';

export function useSocial() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== COMMENTS =====
  const createComment = useCallback(async (request: CreateCommentRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.createComment(user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to create comment');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create comment';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getComments = useCallback(async (filters: CommentFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getComments(filters);
      if (result.error) {
        setError(result.error.message || 'Failed to get comments');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get comments';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.updateComment(commentId, user.id, content);
      if (result.error) {
        setError(result.error.message || 'Failed to update comment');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update comment';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.deleteComment(commentId, user.id);
      if (result.error) {
        setError(result.error.message || 'Failed to delete comment');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete comment';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== LIKES =====
  const toggleLike = useCallback(async (request: CreateLikeRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.toggleLike(user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to toggle like');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle like';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getLikes = useCallback(async (contentId: string, contentType: 'track' | 'event' | 'comment') => {
    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getLikes(contentId, contentType);
      if (result.error) {
        setError(result.error.message || 'Failed to get likes');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get likes';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const isLiked = useCallback(async (contentId: string, contentType: 'track' | 'event' | 'comment') => {
    if (!user?.id) return { data: false, error: 'User not authenticated' };

    try {
      const result = await socialService.isLiked(user.id, contentId, contentType);
      // Don't treat PGRST116 (no rows found) as an error - it's expected when user hasn't liked content
      if (result.error && result.error.code !== 'PGRST116') {
        setError(result.error.message || 'Failed to check like status');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check like status';
      setError(errorMessage);
      return { data: false, error: errorMessage };
    }
  }, [user?.id]);

  // ===== SHARES =====
  const createShare = useCallback(async (request: CreateShareRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 useSocial.createShare called with:', { userId: user.id, request });
      const result = await socialService.createShare(user.id, request);
      console.log('📊 socialService.createShare result:', result);
      
      if (result.error) {
        console.error('❌ Share error from service:', result.error);
        setError(result.error.message || 'Failed to create share');
      }
      return result;
    } catch (err) {
      console.error('❌ Share error in useSocial:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create share';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getShares = useCallback(async (contentId: string, contentType: 'track' | 'event') => {
    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getShares(contentId, contentType);
      if (result.error) {
        setError(result.error.message || 'Failed to get shares');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get shares';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserShares = useCallback(async () => {
    if (!user) return { data: null, error: 'User not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await socialService.getUserShares(user.id);
      if (result.error) {
        setError(result.error.message || 'Failed to get user shares');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user shares';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ===== BOOKMARKS =====
  const toggleBookmark = useCallback(async (request: CreateBookmarkRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.toggleBookmark(user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to toggle bookmark');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle bookmark';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getBookmarks = useCallback(async (contentType?: 'track' | 'event') => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getBookmarks(user.id, contentType);
      if (result.error) {
        setError(result.error.message || 'Failed to get bookmarks');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get bookmarks';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const isBookmarked = useCallback(async (contentId: string, contentType: 'track' | 'event' | 'post') => {
    if (!user?.id) return { data: false, error: 'User not authenticated' };

    try {
      const result = await socialService.isBookmarked(user.id, contentId, contentType);
      if (result.error) {
        setError(result.error.message || 'Failed to check bookmark status');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check bookmark status';
      setError(errorMessage);
      return { data: false, error: errorMessage };
    }
  }, [user?.id]);

  // ===== PLAYLISTS =====
  const createPlaylist = useCallback(async (request: CreatePlaylistRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.createPlaylist(user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to create playlist');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create playlist';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getPlaylists = useCallback(async (filters: PlaylistFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getPlaylists(filters);
      if (result.error) {
        setError(result.error.message || 'Failed to get playlists');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get playlists';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const addTrackToPlaylist = useCallback(async (playlistId: string, request: AddTrackToPlaylistRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.addTrackToPlaylist(playlistId, user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to add track to playlist');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add track to playlist';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const removeTrackFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.removeTrackFromPlaylist(playlistId, user.id, trackId);
      if (result.error) {
        setError(result.error.message || 'Failed to remove track from playlist');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove track from playlist';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== COLLABORATIONS =====
  const createCollaboration = useCallback(async (request: CreateCollaborationRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.createCollaboration(user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to create collaboration');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collaboration';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getCollaborations = useCallback(async (filters: CollaborationFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getCollaborations(filters);
      if (result.error) {
        setError(result.error.message || 'Failed to get collaborations');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get collaborations';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCollaboration = useCallback(async (collaborationId: string, request: UpdateCollaborationRequest) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.updateCollaboration(collaborationId, user.id, request);
      if (result.error) {
        setError(result.error.message || 'Failed to update collaboration');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collaboration';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== NOTIFICATIONS =====
  const getNotifications = useCallback(async (limit = 20) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getNotifications(user.id, limit);
      if (result.error) {
        setError(result.error.message || 'Failed to get notifications');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get notifications';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.markNotificationAsRead(notificationId, user.id);
      if (result.error) {
        setError(result.error.message || 'Failed to mark notification as read');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return { error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.markAllNotificationsAsRead(user.id);
      if (result.error) {
        setError(result.error.message || 'Failed to mark all notifications as read');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== USER FEED =====
  const getUserFeed = useCallback(async (filters: FeedFilters = {}) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getUserFeed(user.id, filters);
      if (result.error) {
        setError(result.error.message || 'Failed to get user feed');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user feed';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== SOCIAL STATS =====
  const getSocialStats = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return { data: null, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await socialService.getSocialStats(user.id);
      if (result.error) {
        setError(result.error.message || 'Failed to get social stats');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get social stats';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ===== UTILITY FUNCTIONS =====
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  return {
    // State
    loading,
    error,
    
    // Comments
    createComment,
    getComments,
    updateComment,
    deleteComment,
    
    // Likes
    toggleLike,
    getLikes,
    isLiked,
    
    // Shares
    createShare,
    getShares,
    getUserShares,
    
    // Bookmarks
    toggleBookmark,
    getBookmarks,
    isBookmarked,
    
    // Playlists
    createPlaylist,
    getPlaylists,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    
    // Collaborations
    createCollaboration,
    getCollaborations,
    updateCollaboration,
    
    // Notifications
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    // User Feed
    getUserFeed,
    
    // Social Stats
    getSocialStats,
    
    // Utilities
    clearError,
    formatDuration,
    formatDate
  };
}
