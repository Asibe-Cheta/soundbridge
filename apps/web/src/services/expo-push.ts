/**
 * Expo Push Notification Service
 * Handles sending push notifications via Expo Push API
 */

import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { createClient } from '@supabase/supabase-js';

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // Use FCM V1 API
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  tickets: ExpoPushTicket[];
  errors?: string[];
}

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Get active push tokens for a user
 */
async function getUserPushTokens(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_push_tokens')
    .select('push_token')
    .eq('user_id', userId)
    .eq('active', true);
  
  if (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }
  
  return data.map((row) => row.push_token).filter((token) => Expo.isExpoPushToken(token));
}

/**
 * Get unread notification count for badge
 */
async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  
  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Log notification in database
 */
async function logNotification(
  userId: string,
  notificationType: string,
  title: string,
  body: string,
  data: Record<string, any>,
  tickets: ExpoPushTicket[]
): Promise<void> {
  const { error } = await supabaseAdmin.from('notification_logs').insert({
    user_id: userId,
    notification_type: notificationType,
    title,
    body,
    data,
    expo_status: tickets[0]?.status || 'unknown',
    expo_receipt_id: tickets[0]?.id || null,
    related_entity_type: data.entityType || null,
    related_entity_id: data.entityId || null,
  });
  
  if (error) {
    console.error('Error logging notification:', error);
  }
}

/**
 * Increment user's daily notification count
 */
async function incrementNotificationCount(userId: string): Promise<void> {
  // Use the database function
  const { error } = await supabaseAdmin.rpc('increment_notification_count', {
    p_user_id: userId,
  });
  
  if (error) {
    console.error('Error incrementing notification count:', error);
  }
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  try {
    // Get user's push tokens
    const tokens = await getUserPushTokens(payload.userId);
    
    if (tokens.length === 0) {
      console.warn(`No push tokens found for user: ${payload.userId}`);
      return {
        success: false,
        tickets: [],
        errors: ['No push tokens found'],
      };
    }
    
    // Get badge count
    const badge = payload.badge ?? (await getUnreadCount(payload.userId)) + 1;
    
    // Create messages
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      sound: payload.sound ?? 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      badge,
      priority: payload.priority ?? 'high',
      channelId: payload.channelId ?? 'default',
    }));
    
    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    const errors: string[] = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        
        // Check for errors
        ticketChunk.forEach((ticket) => {
          if (ticket.status === 'error') {
            console.error('Push notification error:', ticket.message);
            errors.push(ticket.message || 'Unknown error');
          }
        });
      } catch (error: any) {
        console.error('Error sending push notification chunk:', error);
        errors.push(error.message || 'Failed to send chunk');
      }
    }
    
    // Log notification
    await logNotification(
      payload.userId,
      payload.data?.type || 'unknown',
      payload.title,
      payload.body,
      payload.data || {},
      tickets
    );
    
    // Increment notification count (if applicable)
    const unlimitedTypes = ['tip', 'collaboration', 'wallet', 'event_reminder', 'track_approved', 'creator_post'];
    if (!unlimitedTypes.includes(payload.data?.type)) {
      await incrementNotificationCount(payload.userId);
    }
    
    return {
      success: errors.length === 0,
      tickets,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('Error in sendPushNotification:', error);
    return {
      success: false,
      tickets: [],
      errors: [error.message || 'Unknown error'],
    };
  }
}

/**
 * Send push notifications to multiple users (batch)
 */
export async function sendBatchPushNotifications(
  payloads: PushNotificationPayload[]
): Promise<PushNotificationResult[]> {
  const results: PushNotificationResult[] = [];
  
  // Process in parallel (but limited to avoid overwhelming Expo API)
  const batchSize = 10;
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((payload) => sendPushNotification(payload))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Check notification receipts (for delivery confirmation)
 */
export async function checkNotificationReceipts(
  receiptIds: string[]
): Promise<Map<string, ExpoPushReceipt>> {
  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    const receipts = new Map<string, ExpoPushReceipt>();
    
    for (const chunk of receiptIdChunks) {
      try {
        const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        
        // Process receipts
        for (const [id, receipt] of Object.entries(receiptChunk)) {
          receipts.set(id, receipt);
          
          // Update database if delivered
          if (receipt.status === 'ok') {
            await supabaseAdmin
              .from('notification_logs')
              .update({ delivered_at: new Date().toISOString() })
              .eq('expo_receipt_id', id);
          }
          
          // Log errors
          if (receipt.status === 'error') {
            console.error('Receipt error:', receipt.message, receipt.details);
            await supabaseAdmin
              .from('notification_logs')
              .update({ expo_status: 'error' })
              .eq('expo_receipt_id', id);
          }
        }
      } catch (error) {
        console.error('Error fetching receipt chunk:', error);
      }
    }
    
    return receipts;
  } catch (error) {
    console.error('Error in checkNotificationReceipts:', error);
    return new Map();
  }
}

/**
 * Mark push token as inactive (e.g., when device token expires)
 */
export async function deactivatePushToken(pushToken: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_push_tokens')
    .update({ active: false })
    .eq('push_token', pushToken);
  
  if (error) {
    console.error('Error deactivating push token:', error);
  }
}

/**
 * Queue notification for scheduled delivery
 */
export async function queueNotification(
  userId: string,
  notificationType: string,
  title: string,
  body: string,
  data: Record<string, any>,
  scheduledFor: Date,
  priority: number = 0
): Promise<void> {
  const { error } = await supabaseAdmin.from('notification_queue').insert({
    user_id: userId,
    notification_type: notificationType,
    title,
    body,
    data,
    related_entity_type: data.entityType || null,
    related_entity_id: data.entityId || null,
    scheduled_for: scheduledFor.toISOString(),
    priority,
    status: 'pending',
  });
  
  if (error) {
    console.error('Error queueing notification:', error);
  }
}

/**
 * Process queued notifications (called by scheduler)
 */
export async function processQueuedNotifications(): Promise<void> {
  try {
    // Get pending notifications that are due
    const { data: notifications, error } = await supabaseAdmin
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(100);
    
    if (error) {
      console.error('Error fetching queued notifications:', error);
      return;
    }
    
    if (!notifications || notifications.length === 0) {
      return;
    }
    
    console.log(`Processing ${notifications.length} queued notifications...`);
    
    // Send notifications
    for (const notification of notifications) {
      try {
        const result = await sendPushNotification({
          userId: notification.user_id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        
        // Update queue status
        await supabaseAdmin
          .from('notification_queue')
          .update({
            status: result.success ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            error_message: result.errors?.join(', ') || null,
          })
          .eq('id', notification.id);
      } catch (error: any) {
        console.error('Error sending queued notification:', error);
        await supabaseAdmin
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
          })
          .eq('id', notification.id);
      }
    }
  } catch (error) {
    console.error('Error in processQueuedNotifications:', error);
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Test push notification (for development/testing)
 */
export async function sendTestNotification(userId: string): Promise<PushNotificationResult> {
  return sendPushNotification({
    userId,
    title: 'Test Notification 🔔',
    body: 'This is a test notification from SoundBridge!',
    data: {
      type: 'test',
      deepLink: 'soundbridge://home',
    },
  });
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number;
  unread: number;
  delivered: number;
  clicked: number;
}> {
  const { data, error } = await supabaseAdmin
    .from('notification_logs')
    .select('*')
    .eq('user_id', userId);
  
  if (error || !data) {
    return { total: 0, unread: 0, delivered: 0, clicked: 0 };
  }
  
  return {
    total: data.length,
    unread: data.filter((n) => !n.read_at).length,
    delivered: data.filter((n) => n.delivered_at).length,
    clicked: data.filter((n) => n.clicked_at).length,
  };
}

