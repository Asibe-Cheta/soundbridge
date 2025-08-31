import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../lib/notification-service';
import type { Notification } from '../lib/types/social';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

interface NotificationsActions {
  fetchNotifications: (limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<{ success: boolean; error: string | null }>;
  markAllAsRead: () => Promise<{ success: boolean; error: string | null }>;
  deleteNotification: (notificationId: string) => Promise<{ success: boolean; error: string | null }>;
  refreshUnreadCount: () => Promise<void>;
}

export function useNotifications(): [NotificationsState, NotificationsActions] {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null
  });

  const fetchNotifications = useCallback(async (limit = 20) => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await notificationService.getNotifications(user.id, limit);
      
      if (result.error) {
        setState(prev => ({ ...prev, error: result.error, loading: false }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        notifications: result.data || [], 
        loading: false 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const result = await notificationService.markAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        }));
        
        // Refresh unread count
        await refreshUnreadCount();
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark notification as read';
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const result = await notificationService.markAllAsRead(user.id);
      
      if (result.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notification => ({
            ...notification,
            is_read: true
          })),
          unreadCount: 0
        }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const result = await notificationService.deleteNotification(notificationId);
      
      if (result.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.filter(notification => notification.id !== notificationId)
        }));
        
        // Refresh unread count
        await refreshUnreadCount();
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete notification';
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const result = await notificationService.getUnreadCount(user.id);
      
      if (!result.error) {
        setState(prev => ({ 
          ...prev, 
          unreadCount: result.data || 0
        }));
      }
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, [user]);

  // Auto-fetch notifications and unread count when user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      refreshUnreadCount();
    }
  }, [user, fetchNotifications, refreshUnreadCount]);

  // Set up real-time subscription for notifications (with fallback)
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time subscription for user:', user.id);
    
    // Use the browser client for real-time subscriptions
    const { createBrowserClient } = require('@/src/lib/supabase');
    const supabase = createBrowserClient();
    
    // Subscribe to changes in the notifications table for this user
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🔔 Real-time notification INSERT:', payload);
          
          // Refresh notifications and unread count immediately
          fetchNotifications();
          refreshUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🔔 Real-time notification UPDATE:', payload);
          
          // Refresh notifications and unread count immediately
          fetchNotifications();
          refreshUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          console.log('🔔 Real-time notification DELETE:', payload);
          
          // Refresh notifications and unread count immediately
          fetchNotifications();
          refreshUnreadCount();
        }
      )
      .subscribe((status: any) => {
        console.log('🔔 Real-time subscription status:', status);
        
        // If real-time fails, we'll rely on the periodic refresh
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.log('⚠️ Real-time subscription failed, using periodic refresh only');
        }
      });

    return () => {
      console.log('🔔 Unsubscribing from real-time notifications');
      subscription.unsubscribe();
    };
  }, [user, fetchNotifications, refreshUnreadCount]);

  // Set up periodic refresh of unread count (every 30 seconds) as backup
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  return [state, {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshUnreadCount
  }];
}
