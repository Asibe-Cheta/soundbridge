/**
 * Event Notification Service
 * Handles push notification logic for featured events
 * Implements mobile team's requirements for smart event notifications
 */

import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize Expo SDK
const expo = new Expo();

// Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials for Event Notification Service');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Types
interface Event {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string;
  location: string;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  notification_catchphrase: string | null;
  creator_id: string;
}

interface EventOrganizer {
  display_name: string;
  username: string;
}

interface MatchingUser {
  user_id: string;
  push_token: string;
  notification_radius_km: number;
  event_categories: string[];
  max_notifications_per_week: number;
  notifications_sent_this_week: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface NotificationStyle {
  type: 'organizer_focus' | 'event_type_focus' | 'catchphrase' | 'standard';
  title: string;
  body: string;
}

class EventNotificationService {
  /**
   * Queue notifications for a featured event
   * Called when an event is created/published with is_featured = true
   */
  async queueNotificationsForEvent(eventId: string): Promise<{ success: boolean; queued_count: number; error?: string }> {
    try {
      console.log(`📧 Queuing notifications for event: ${eventId}`);

      // Get event details
      const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey (
            display_name,
            username
          )
        `)
        .eq('id', eventId)
        .eq('is_featured', true)
        .single();

      if (eventError || !event) {
        console.error('❌ Error fetching event:', eventError);
        return { success: false, queued_count: 0, error: 'Event not found or not featured' };
      }

      // Get matching users using the database function
      const { data: matchingUsers, error: usersError } = await supabaseAdmin
        .rpc('get_matching_users_for_event', { p_event_id: eventId });

      if (usersError) {
        console.error('❌ Error fetching matching users:', usersError);
        return { success: false, queued_count: 0, error: usersError.message };
      }

      if (!matchingUsers || matchingUsers.length === 0) {
        console.log('ℹ️ No matching users found for this event');
        return { success: true, queued_count: 0 };
      }

      console.log(`✅ Found ${matchingUsers.length} matching users`);

      // Get organizer info
      const organizer = (event.creator as any)?.[0];

      // Queue notifications for each matching user
      const notifications = [];
      for (const user of matchingUsers) {
        // Check if already notified
        const { data: existingNotif } = await supabaseAdmin
          .from('event_notifications')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('event_id', eventId)
          .eq('notification_type', 'event_announcement')
          .single();

        if (existingNotif) {
          console.log(`⏭️ User ${user.user_id} already has notification for this event`);
          continue;
        }

        // Select notification style dynamically
        const notificationStyle = this.selectNotificationStyle(event, organizer);

        // Calculate scheduled time (respect quiet hours and advance days)
        const scheduledFor = this.calculateScheduledTime(
          user.quiet_hours_enabled,
          user.quiet_hours_start,
          user.quiet_hours_end
        );

        notifications.push({
          user_id: user.user_id,
          event_id: eventId,
          notification_type: 'event_announcement',
          notification_style: notificationStyle.type,
          title: notificationStyle.title,
          body: notificationStyle.body,
          status: 'queued',
          scheduled_for: scheduledFor,
        });
      }

      // Bulk insert notifications
      if (notifications.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('event_notifications')
          .insert(notifications);

        if (insertError) {
          console.error('❌ Error inserting notifications:', insertError);
          return { success: false, queued_count: 0, error: insertError.message };
        }

        // Update event notification status
        await supabaseAdmin
          .from('events')
          .update({
            notification_sent: true,
            notification_sent_at: new Date().toISOString(),
            notification_count: notifications.length
          })
          .eq('id', eventId);
      }

      console.log(`✅ Queued ${notifications.length} notifications successfully`);

      return {
        success: true,
        queued_count: notifications.length
      };
    } catch (error) {
      console.error('❌ Error in queueNotificationsForEvent:', error);
      return {
        success: false,
        queued_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send queued notifications (called by background job)
   * Processes notifications with status='queued' and scheduled_for <= NOW()
   */
  async sendQueuedNotifications(): Promise<{ success: boolean; sent_count: number; failed_count: number }> {
    try {
      console.log('📤 Sending queued notifications...');

      // Get queued notifications ready to be sent
      const { data: notifications, error: fetchError } = await supabaseAdmin
        .from('event_notifications')
        .select(`
          *,
          event:events (
            id,
            title,
            event_date,
            location
          )
        `)
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .lt('retry_count', 3) // Max 3 retries
        .limit(100); // Process 100 at a time

      if (fetchError) {
        console.error('❌ Error fetching queued notifications:', fetchError);
        return { success: false, sent_count: 0, failed_count: 0 };
      }

      if (!notifications || notifications.length === 0) {
        console.log('ℹ️ No queued notifications to send');
        return { success: true, sent_count: 0, failed_count: 0 };
      }

      console.log(`📧 Processing ${notifications.length} queued notifications`);

      // Get push tokens for users
      const userIds = notifications.map(n => n.user_id);
      const { data: pushTokens, error: tokenError } = await supabaseAdmin
        .from('user_push_tokens')
        .select('user_id, push_token')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (tokenError) {
        console.error('❌ Error fetching push tokens:', tokenError);
        return { success: false, sent_count: 0, failed_count: 0 };
      }

      // Create a map of user_id -> push_token
      const tokenMap = new Map(
        pushTokens?.map(t => [t.user_id, t.push_token]) || []
      );

      // Prepare Expo push messages
      const messages: ExpoPushMessage[] = [];
      const notificationIdMap = new Map<string, string>(); // push_token -> notification_id

      for (const notification of notifications) {
        const pushToken = tokenMap.get(notification.user_id);

        if (!pushToken) {
          console.log(`⚠️ No push token found for user ${notification.user_id}`);
          // Mark as failed
          await this.updateNotificationStatus(notification.id, 'failed', null, 'No push token found');
          continue;
        }

        // Validate push token
        if (!Expo.isExpoPushToken(pushToken)) {
          console.log(`⚠️ Invalid push token for user ${notification.user_id}`);
          await this.updateNotificationStatus(notification.id, 'failed', null, 'Invalid push token');
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: {
            type: 'event.announcement',
            eventId: notification.event_id,
            notificationId: notification.id,
            action: 'VIEW_EVENT',
          },
          channelId: 'events',
          priority: 'high',
          badge: 1,
        });

        notificationIdMap.set(pushToken, notification.id);
      }

      if (messages.length === 0) {
        console.log('ℹ️ No valid messages to send');
        return { success: true, sent_count: 0, failed_count: 0 };
      }

      // Send notifications in chunks
      const chunks = expo.chunkPushNotifications(messages);
      let sentCount = 0;
      let failedCount = 0;

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

          // Process tickets
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            const message = chunk[i];
            const notificationId = notificationIdMap.get(message.to as string);

            if (!notificationId) continue;

            if (ticket.status === 'ok') {
              // Mark as sent
              await this.updateNotificationStatus(
                notificationId,
                'sent',
                ticket.id,
                null
              );

              // Increment user notification count
              await supabaseAdmin.rpc('increment_user_notification_count', {
                p_user_id: notifications.find(n => n.id === notificationId)?.user_id
              });

              sentCount++;
            } else {
              // Mark as failed
              await this.updateNotificationStatus(
                notificationId,
                'failed',
                null,
                ticket.message
              );
              failedCount++;
            }
          }
        } catch (error) {
          console.error('❌ Error sending notification chunk:', error);
          failedCount += chunk.length;
        }
      }

      console.log(`✅ Sent ${sentCount} notifications, ${failedCount} failed`);

      return {
        success: true,
        sent_count: sentCount,
        failed_count: failedCount
      };
    } catch (error) {
      console.error('❌ Error in sendQueuedNotifications:', error);
      return {
        success: false,
        sent_count: 0,
        failed_count: 0
      };
    }
  }

  /**
   * Send a test notification to a specific user
   */
  async sendTestNotification(
    userId: string,
    title: string,
    body: string,
    eventId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's push token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (tokenError || !tokenData) {
        return { success: false, error: 'No active push token found for user' };
      }

      const pushToken = tokenData.push_token;

      if (!Expo.isExpoPushToken(pushToken)) {
        return { success: false, error: 'Invalid push token' };
      }

      const message: ExpoPushMessage = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: {
          type: 'test',
          eventId: eventId || 'test',
          action: 'VIEW_EVENT',
        },
        channelId: 'events',
        priority: 'high',
      };

      const ticketChunk = await expo.sendPushNotificationsAsync([message]);
      const ticket = ticketChunk[0];

      if (ticket.status === 'ok') {
        console.log('✅ Test notification sent successfully');
        return { success: true };
      } else {
        console.error('❌ Test notification failed:', ticket.message);
        return { success: false, error: ticket.message };
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Select notification style dynamically
   * 40% catchphrase, 30% organizer focus, 20% event type, 10% standard
   */
  private selectNotificationStyle(event: Event, organizer?: EventOrganizer): NotificationStyle {
    const random = Math.random();

    // 40% chance for catchphrase if available
    if (event.notification_catchphrase && random < 0.4) {
      return {
        type: 'catchphrase',
        title: event.title,
        body: event.notification_catchphrase
      };
    }

    // 30% chance for organizer focus (40-70% range)
    if (organizer && random < 0.7) {
      const timeFrame = this.getTimeFrame(event.event_date);
      return {
        type: 'organizer_focus',
        title: 'New Event Near You!',
        body: `${organizer.display_name} has a ${event.category.toLowerCase()} event in ${event.location} ${timeFrame}`
      };
    }

    // 20% chance for event type focus (70-90% range)
    if (random < 0.9) {
      const timeFrame = this.getTimeFrame(event.event_date);
      return {
        type: 'event_type_focus',
        title: 'Featured Event',
        body: `There's a ${event.category.toLowerCase()} event in ${event.location} ${timeFrame}`
      };
    }

    // 10% standard format
    return {
      type: 'standard',
      title: event.title,
      body: `${this.formatDate(event.event_date)} at ${event.venue || event.location}`
    };
  }

  /**
   * Get time frame description (e.g., "next week", "this month")
   */
  private getTimeFrame(eventDate: string): string {
    const date = new Date(eventDate);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 1) return 'tomorrow';
    if (daysUntil <= 7) return 'this week';
    if (daysUntil <= 14) return 'next week';
    if (daysUntil <= 30) return 'this month';
    return 'next month';
  }

  /**
   * Format date for notification
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Calculate scheduled time respecting quiet hours
   */
  private calculateScheduledTime(
    quietHoursEnabled: boolean,
    quietHoursStart: string,
    quietHoursEnd: string
  ): string {
    const now = new Date();

    if (!quietHoursEnabled) {
      return now.toISOString();
    }

    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);

    // Check if currently in quiet hours
    const isInQuietHours = this.isTimeInRange(
      currentHour,
      currentMinute,
      startHour,
      startMinute,
      endHour,
      endMinute
    );

    if (isInQuietHours) {
      // Schedule for end of quiet hours
      const scheduledDate = new Date(now);
      scheduledDate.setUTCHours(endHour, endMinute, 0, 0);
      
      // If end time is earlier than current time, it means it's tomorrow
      if (scheduledDate.getTime() < now.getTime()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
      
      return scheduledDate.toISOString();
    }

    return now.toISOString();
  }

  /**
   * Check if time is within range (handles midnight crossing)
   */
  private isTimeInRange(
    hour: number,
    minute: number,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number
  ): boolean {
    const current = hour * 60 + minute;
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (start > end) {
      // Range crosses midnight
      return current >= start || current <= end;
    } else {
      return current >= start && current <= end;
    }
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: string,
    expoTicketId: string | null,
    errorMessage: string | null
  ): Promise<void> {
    await supabaseAdmin.rpc('update_notification_status', {
      p_notification_id: notificationId,
      p_status: status,
      p_expo_ticket_id: expoTicketId,
      p_error_message: errorMessage
    });
  }
}

// Export singleton instance
export const eventNotificationService = new EventNotificationService();

