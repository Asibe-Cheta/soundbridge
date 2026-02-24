/**
 * Notification Scheduler
 * Background job for processing and sending batch notifications
 * 
 * This should be run via a cron job or scheduled task at regular intervals
 */

import { createClient } from '@supabase/supabase-js';
import {
  shouldSendEventNotification,
  selectNotificationFormat,
  generateEventNotification,
  isWithinNotificationWindow,
  canSendNotification,
  getHoursUntilEvent,
  type UserNotificationPreferences,
  type EventData,
  type CreatorData,
} from '../lib/notification-utils';
import { sendPushNotification, sendBatchPushNotifications, processQueuedNotifications } from './expo-push';

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase env not configured');
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}

// =====================================================
// EVENT NOTIFICATION SCHEDULER
// =====================================================

/**
 * Process new events and send notifications to eligible users
 */
export async function processNewEventNotifications(): Promise<void> {
  try {
    console.log('🔔 Processing new event notifications...');
    
    // Get events created in last 24 hours that haven't been processed
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: events, error: eventsError } = await getSupabaseAdmin()
      .from('events')
      .select('*')
      .gte('created_at', yesterday)
      .eq('status', 'published');
    
    if (eventsError || !events || events.length === 0) {
      console.log('No new events to process');
      return;
    }
    
    console.log(`Found ${events.length} new events`);
    
    // Process each event
    for (const event of events) {
      await processEventNotifications(event);
    }
    
    console.log('✅ Event notification processing complete');
  } catch (error) {
    console.error('❌ Error processing event notifications:', error);
  }
}

/**
 * Process urgent event notifications (< 24 hours away)
 */
export async function processUrgentEventNotifications(): Promise<void> {
  try {
    console.log('⚡ Processing urgent event notifications...');
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Get events starting in next 24 hours
    const { data: events, error } = await getSupabaseAdmin()
      .from('events')
      .select('*')
      .gte('event_date', now.toISOString())
      .lte('event_date', in24Hours.toISOString())
      .eq('status', 'published');
    
    if (error || !events || events.length === 0) {
      console.log('No urgent events to process');
      return;
    }
    
    console.log(`Found ${events.length} urgent events`);
    
    // Process each urgent event
    for (const event of events) {
      // Check if we already sent urgent notification
      const { data: sentNotifs } = await getSupabaseAdmin()
        .from('notification_logs')
        .select('id')
        .eq('related_entity_id', event.id)
        .eq('related_entity_type', 'event')
        .contains('data', { urgency: 'high' })
        .limit(1);
      
      if (sentNotifs && sentNotifs.length > 0) {
        continue; // Already sent urgent notification
      }
      
      await processEventNotifications(event, true); // Force urgent format
    }
    
    console.log('✅ Urgent event notification processing complete');
  } catch (error) {
    console.error('❌ Error processing urgent event notifications:', error);
  }
}

/**
 * Process notifications for a specific event
 */
async function processEventNotifications(event: any, forceUrgent: boolean = false): Promise<void> {
  try {
    // Get creator details
    const { data: creator, error: creatorError } = await getSupabaseAdmin()
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', event.creator_id)
      .single();
    
    if (creatorError || !creator) {
      console.error('Creator not found for event:', event.id);
      return;
    }
    
    // Get creator follower count
    const { count: followerCount } = await getSupabaseAdmin()
      .from('creator_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', event.creator_id);
    
    const creatorData: CreatorData = {
      id: creator.id,
      username: creator.username,
      display_name: creator.display_name,
      follower_count: followerCount || 0,
    };
    
    const eventData: EventData = {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      state: event.state || '',
      country: event.country || '',
      location: event.location || '',
      venue: event.venue,
      city: event.city,
      price_gbp: event.price_gbp,
      price_ngn: event.price_ngn,
      max_attendees: event.max_attendees,
      current_attendees: event.current_attendees,
      event_date: event.event_date,
      creator_id: event.creator_id,
    };
    
    // Get eligible users (same state + genre match)
    const { data: eligibleUsers, error: usersError } = await getSupabaseAdmin()
      .from('user_notification_preferences')
      .select('*')
      .eq('notifications_enabled', true)
      .eq('event_notifications_enabled', true)
      .eq('location_state', event.state)
      .contains('preferred_event_genres', [event.category]);
    
    if (usersError || !eligibleUsers || eligibleUsers.length === 0) {
      console.log(`No eligible users for event ${event.id}`);
      return;
    }
    
    console.log(`Found ${eligibleUsers.length} eligible users for event ${event.id}`);
    
    // Check if similar events exist for batching
    const { count: similarEventsCount } = await getSupabaseAdmin()
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('state', event.state)
      .eq('category', event.category)
      .gte('event_date', event.event_date)
      .lte('event_date', new Date(new Date(event.event_date).getTime() + 24 * 60 * 60 * 1000).toISOString());
    
    const notifications = [];
    
    // Process each eligible user
    for (const userPrefs of eligibleUsers) {
      // Check if user should receive notification
      if (!shouldSendEventNotification(eventData, userPrefs as UserNotificationPreferences)) {
        continue;
      }
      
      // Check time window
      if (!isWithinNotificationWindow(userPrefs as UserNotificationPreferences)) {
        // Queue for later
        continue;
      }
      
      // Check rate limit
      if (!canSendNotification(userPrefs as UserNotificationPreferences, 'event')) {
        continue;
      }
      
      // Check if already notified about this event
      const { data: existingNotif } = await getSupabaseAdmin()
        .from('notification_logs')
        .select('id')
        .eq('user_id', userPrefs.user_id)
        .eq('related_entity_id', event.id)
        .limit(1);
      
      if (existingNotif && existingNotif.length > 0) {
        continue; // Already notified
      }
      
      // Check if following creator
      const { data: subscription } = await getSupabaseAdmin()
        .from('creator_subscriptions')
        .select('notify_on_event_post')
        .eq('user_id', userPrefs.user_id)
        .eq('creator_id', event.creator_id)
        .single();
      
      const isFollowing = subscription?.notify_on_event_post || false;
      
      // Select format
      let format = forceUrgent 
        ? 'urgent' 
        : selectNotificationFormat(eventData, creatorData, similarEventsCount || 0, isFollowing);
      
      // Get user's display name
      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('username')
        .eq('id', userPrefs.user_id)
        .single();
      
      const username = profile?.username || 'there';
      
      // Generate notification content
      const notification = generateEventNotification(
        format as any,
        eventData,
        creatorData,
        username,
        userPrefs.timezone,
        similarEventsCount || undefined
      );
      
      // Add to batch
      notifications.push({
        userId: userPrefs.user_id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
    
    // Send batch notifications
    if (notifications.length > 0) {
      console.log(`Sending ${notifications.length} notifications for event ${event.id}`);
      await sendBatchPushNotifications(notifications);
    }
  } catch (error) {
    console.error('Error processing event notifications:', error);
  }
}

// =====================================================
// SCHEDULED JOBS
// =====================================================

/**
 * Morning batch (9:00 AM) - New events + weekend preview
 */
export async function morningBatch(): Promise<void> {
  console.log('☀️ Running morning batch...');
  await processNewEventNotifications();
  
  // Check if it's Friday for weekend preview
  const now = new Date();
  if (now.getDay() === 5) {
    // TODO: Implement weekend preview logic
    console.log('📅 Friday - Weekend preview (TODO)');
  }
  
  console.log('✅ Morning batch complete');
}

/**
 * Afternoon batch (2:00 PM) - Urgent events + popular creators
 */
export async function afternoonBatch(): Promise<void> {
  console.log('🌤️ Running afternoon batch...');
  await processUrgentEventNotifications();
  console.log('✅ Afternoon batch complete');
}

/**
 * Evening batch (7:00 PM) - Event reminders
 */
export async function eveningBatch(): Promise<void> {
  console.log('🌙 Running evening batch...');
  
  // Get events happening tomorrow
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);
  
  const { data: upcomingEvents, error } = await getSupabaseAdmin()
    .from('events')
    .select('*')
    .gte('event_date', tomorrow.toISOString())
    .lte('event_date', dayAfterTomorrow.toISOString());
  
  if (error || !upcomingEvents) {
    console.log('No upcoming events for reminders');
    return;
  }
  
  // TODO: Implement event reminder logic for users who booked tickets
  console.log(`📅 Found ${upcomingEvents.length} events for reminders (TODO)`);
  
  console.log('✅ Evening batch complete');
}

/**
 * Process queued notifications (every 15 minutes)
 */
export async function processQueue(): Promise<void> {
  console.log('⏰ Processing notification queue...');
  await processQueuedNotifications();
  console.log('✅ Queue processing complete');
}

// =====================================================
// MAIN SCHEDULER FUNCTION
// =====================================================

/**
 * Main scheduler function - call this from a cron job
 * 
 * Example cron schedule:
 * - 0 9 * * * - Morning batch (9 AM)
 * - 0 14 * * * - Afternoon batch (2 PM)
 * - 0 19 * * * - Evening batch (7 PM)
 * - Every 15 minutes - Queue processor
 */
export async function runScheduler(job: 'morning' | 'afternoon' | 'evening' | 'queue'): Promise<void> {
  try {
    console.log(`\n🚀 Starting ${job} scheduler job at ${new Date().toISOString()}`);
    
    switch (job) {
      case 'morning':
        await morningBatch();
        break;
      case 'afternoon':
        await afternoonBatch();
        break;
      case 'evening':
        await eveningBatch();
        break;
      case 'queue':
        await processQueue();
        break;
    }
    
    console.log(`✅ ${job} scheduler job completed at ${new Date().toISOString()}\n`);
  } catch (error) {
    console.error(`❌ Error in ${job} scheduler job:`, error);
  }
}

