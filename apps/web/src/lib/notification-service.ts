// @ts-nocheck
import { createBrowserClient, createApiClient } from './supabase';
import type { Notification } from './types/social';

export interface CreateNotificationData {
  user_id: string;
  type: 'follow' | 'like' | 'comment' | 'share' | 'collaboration' | 'event' | 'system' | 'collaboration_request';
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  collaboration_requests: {
    new_requests: boolean;
    request_updates: boolean;
    request_reminders: boolean;
    delivery_methods: string[];
  };
  push_notifications: boolean;
  email_notifications: boolean;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

class NotificationService {
  private supabase = createBrowserClient();
  
  // Method to get API client for server-side operations
  getApiClient() {
    return this.supabase;
  }

  // Create a new notification
  async createNotification(data: CreateNotificationData): Promise<{ data: Notification | null; error: string | null }> {
    try {
      console.log('🔔 Creating notification:', data);

      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          type: data.type,
          title: data.title,
          message: data.message,
          related_id: data.related_id || null,
          related_type: data.related_type || null,
          action_url: data.action_url || null,
          metadata: data.metadata || null,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating notification:', error);
        return { data: null, error: 'Failed to create notification' };
      }

      console.log('✅ Notification created successfully:', notification);

      // Send push notification if enabled
      await this.sendPushNotification(data);

      return { data: notification, error: null };
    } catch (error) {
      console.error('❌ Unexpected error creating notification:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  // Get notifications for a user
  async getNotifications(userId: string, limit = 20): Promise<{ data: Notification[] | null; error: string | null }> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        return { data: null, error: 'Failed to fetch notifications' };
      }

      return { data: notifications, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching notifications:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return { success: false, error: 'Failed to mark notification as read' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error marking notification as read:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
        return { success: false, error: 'Failed to mark notifications as read' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error marking all notifications as read:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<{ data: number | null; error: string | null }> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error getting unread count:', error);
        return { data: null, error: 'Failed to get unread count' };
      }

      return { data: count || 0, error: null };
    } catch (error) {
      console.error('❌ Unexpected error getting unread count:', error);
      return { data: null, error: 'Internal server error' };
    }
  }

  // Send push notification (web-based for now, mobile-ready for later)
  private async sendPushNotification(data: CreateNotificationData): Promise<void> {
    try {
      // Check if user has push notifications enabled
      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('push_notifications')
        .eq('user_id', data.user_id)
        .single();

      if (!preferences?.push_notifications) {
        console.log('📱 Push notifications disabled for user');
        return;
      }

      // For web push notifications, we'll use the browser's Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.message,
            icon: '/images/logos/logo-trans-lockup.png',
            badge: '/images/logos/logo-trans-lockup.png',
            tag: data.type,
            data: {
              url: data.action_url || '/notifications'
            }
          });
        } else if (Notification.permission === 'default') {
          // Request permission
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(data.title, {
                body: data.message,
                icon: '/images/logos/logo-trans-lockup.png',
                badge: '/images/logos/logo-trans-lockup.png',
                tag: data.type,
                data: {
                  url: data.action_url || '/notifications'
                }
              });
            }
          });
        }
      }

      console.log('📱 Push notification sent');
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  }

  // Collaboration request specific notifications
  async createCollaborationRequestNotification(
    creatorId: string,
    requesterId: string,
    requestId: string,
    requesterName: string,
    subject: string
  ): Promise<{ data: Notification | null; error: string | null }> {
    return this.createNotification({
      user_id: creatorId,
      type: 'collaboration_request',
      title: 'New Collaboration Request',
      message: `${requesterName} wants to collaborate with you: "${subject}"`,
      related_id: requestId,
      related_type: 'collaboration_request',
      action_url: `/availability?request=${requestId}`,
      metadata: {
        requester_id: requesterId,
        requester_name: requesterName,
        subject: subject
      }
    });
  }

  async createCollaborationRequestUpdateNotification(
    requesterId: string,
    creatorId: string,
    requestId: string,
    creatorName: string,
    status: 'accepted' | 'declined'
  ): Promise<{ data: Notification | null; error: string | null }> {
    const statusText = status === 'accepted' ? 'accepted' : 'declined';
    return this.createNotification({
      user_id: requesterId,
      type: 'collaboration',
      title: 'Collaboration Request Update',
      message: `${creatorName} has ${statusText} your collaboration request`,
      related_id: requestId,
      related_type: 'collaboration_request',
      action_url: `/availability?request=${requestId}`,
      metadata: {
        creator_id: creatorId,
        creator_name: creatorName,
        status: status
      }
    });
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error deleting notification:', error);
        return { success: false, error: 'Failed to delete notification' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error deleting notification:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

export const notificationService = new NotificationService();
