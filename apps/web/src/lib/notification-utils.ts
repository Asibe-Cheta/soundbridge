/**
 * Notification System Utilities
 * Helper functions for targeting, filtering, and formatting notifications
 */

import { DateTime } from 'luxon';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface UserNotificationPreferences {
  user_id: string;
  notifications_enabled: boolean;
  notification_start_hour: number;
  notification_end_hour: number;
  timezone: string;
  max_notifications_per_day: number;
  notification_count_today: number;
  last_notification_reset_date: string;
  event_notifications_enabled: boolean;
  message_notifications_enabled: boolean;
  tip_notifications_enabled: boolean;
  collaboration_notifications_enabled: boolean;
  wallet_notifications_enabled: boolean;
  preferred_event_genres: string[];
  location_state: string | null;
  location_country: string | null;
}

export interface EventData {
  id: string;
  title: string;
  category: string;
  state: string;
  country: string;
  location: string;
  event_date: string;
  creator_id: string;
}

export interface CreatorData {
  id: string;
  username: string;
  follower_count: number;
}

export type NotificationFormat = 
  | 'standard'
  | 'popular_creator'
  | 'multiple_events'
  | 'urgent'
  | 'genre_specific'
  | 'weekend_roundup'
  | 'creator_followed';

export type NotificationType =
  | 'event'
  | 'tip'
  | 'message'
  | 'collaboration'
  | 'wallet'
  | 'event_reminder'
  | 'track_approved'
  | 'creator_post'
  | 'collaboration_request'
  | 'collaboration_accepted'
  | 'collaboration_declined';

// =====================================================
// TIMEZONE & TIME WINDOW UTILITIES
// =====================================================

/**
 * Get current hour in user's timezone
 */
export function getCurrentHourInTimezone(timezone: string): number {
  try {
    const now = DateTime.now().setZone(timezone);
    return now.hour;
  } catch (error) {
    console.error('Invalid timezone:', timezone, error);
    return DateTime.now().hour; // Fallback to UTC
  }
}

/**
 * Check if current time is within user's notification window
 */
export function isWithinNotificationWindow(
  prefs: UserNotificationPreferences
): boolean {
  const currentHour = getCurrentHourInTimezone(prefs.timezone);
  return (
    currentHour >= prefs.notification_start_hour &&
    currentHour < prefs.notification_end_hour
  );
}

/**
 * Convert timestamp to user's timezone
 */
export function convertToTimezone(
  timestamp: string | Date,
  timezone: string
): DateTime {
  try {
    return DateTime.fromJSDate(new Date(timestamp)).setZone(timezone);
  } catch (error) {
    console.error('Error converting timezone:', error);
    return DateTime.fromJSDate(new Date(timestamp));
  }
}

/**
 * Format date naturally (e.g., "Tuesday, next month", "This Monday")
 */
export function formatNaturalDate(eventDate: string, timezone: string): string {
  const now = DateTime.now().setZone(timezone);
  const event = DateTime.fromISO(eventDate).setZone(timezone);
  
  const diffInDays = Math.floor(event.diff(now, 'days').days);
  const diffInMonths = Math.floor(event.diff(now, 'months').months);
  
  // Today
  if (diffInDays === 0) {
    return 'Today';
  }
  
  // Tomorrow
  if (diffInDays === 1) {
    return 'Tomorrow';
  }
  
  // This week (next 7 days)
  if (diffInDays > 0 && diffInDays <= 7) {
    return `This ${event.weekdayLong}`;
  }
  
  // Next week (8-14 days)
  if (diffInDays > 7 && diffInDays <= 14) {
    return `Next ${event.weekdayLong}`;
  }
  
  // Within this month
  if (diffInMonths === 0) {
    return `${event.weekdayLong}, ${event.toFormat('MMMM d')}`;
  }
  
  // Next month
  if (diffInMonths === 1) {
    return `${event.weekdayLong}, next month`;
  }
  
  // Within 2 months
  if (diffInMonths < 2) {
    return `${event.toFormat('EEEE, MMMM d')}`;
  }
  
  // This year
  if (event.year === now.year) {
    return `in ${event.monthLong}`;
  }
  
  // Future years
  return `in ${event.monthLong} ${event.year}`;
}

/**
 * Get hours until event
 */
export function getHoursUntilEvent(eventDate: string): number {
  const now = DateTime.now();
  const event = DateTime.fromISO(eventDate);
  return Math.floor(event.diff(now, 'hours').hours);
}

// =====================================================
// RATE LIMITING
// =====================================================

/**
 * Check if user can receive notification (rate limit check)
 */
export function canSendNotification(
  prefs: UserNotificationPreferences,
  notificationType: NotificationType
): boolean {
  // Unlimited types
  const unlimitedTypes: NotificationType[] = [
    'tip',
    'collaboration',
    'wallet',
    'event_reminder',
    'track_approved',
    'creator_post',
    'collaboration_request',
    'collaboration_accepted',
    'collaboration_declined',
  ];
  
  if (unlimitedTypes.includes(notificationType)) {
    return true;
  }
  
  // Check daily limit
  return prefs.notification_count_today < prefs.max_notifications_per_day;
}

/**
 * Check if notification count needs reset (new day)
 */
export function needsCountReset(prefs: UserNotificationPreferences): boolean {
  const lastReset = DateTime.fromISO(prefs.last_notification_reset_date);
  const now = DateTime.now();
  return lastReset.toISODate() !== now.toISODate();
}

// =====================================================
// TARGETING LOGIC
// =====================================================

/**
 * Check if user should receive event notification
 */
export function shouldSendEventNotification(
  event: EventData,
  user: UserNotificationPreferences
): boolean {
  // 1. Master toggle
  if (!user.notifications_enabled || !user.event_notifications_enabled) {
    return false;
  }
  
  // 2. Time window
  if (!isWithinNotificationWindow(user)) {
    return false;
  }
  
  // 3. Rate limit
  if (!canSendNotification(user, 'event')) {
    return false;
  }
  
  // 4. Location match (same state)
  if (event.state !== user.location_state) {
    return false;
  }
  
  // 5. Genre match
  if (
    user.preferred_event_genres.length > 0 &&
    !user.preferred_event_genres.includes(event.category)
  ) {
    return false;
  }
  
  return true;
}

// =====================================================
// NOTIFICATION FORMAT SELECTION
// =====================================================

/**
 * Select appropriate notification format for event
 */
export function selectNotificationFormat(
  event: EventData,
  creator: CreatorData,
  similarEventsCount: number,
  isFollowing: boolean
): NotificationFormat {
  const hoursUntilEvent = getHoursUntilEvent(event.event_date);
  
  // Format 4: Urgent (< 24 hours)
  if (hoursUntilEvent <= 24 && hoursUntilEvent > 0) {
    return 'urgent';
  }
  
  // Format 7: Following creator with notifications enabled
  if (isFollowing) {
    return 'creator_followed';
  }
  
  // Format 2: Popular creator (100+ followers)
  if (creator.follower_count >= 100) {
    return 'popular_creator';
  }
  
  // Format 3: Multiple similar events
  if (similarEventsCount >= 3) {
    return 'multiple_events';
  }
  
  // Format 1: Standard
  return 'standard';
}

// =====================================================
// NOTIFICATION CONTENT GENERATION
// =====================================================

interface EventNotificationContent {
  title: string;
  body: string;
  data: Record<string, any>;
}

/**
 * Generate event notification content based on format
 */
export function generateEventNotification(
  format: NotificationFormat,
  event: EventData,
  creator: CreatorData,
  username: string,
  timezone: string,
  eventsCount?: number
): EventNotificationContent {
  const naturalDate = formatNaturalDate(event.event_date, timezone);
  
  switch (format) {
    case 'standard':
      return {
        title: 'New Event Near You 🎉',
        body: `Hey, ${username}, there is an event at ${event.location}, for ${event.title}, check it out.`,
        data: {
          type: 'event',
          eventId: event.id,
          deepLink: `soundbridge://event/${event.id}`,
        },
      };
      
    case 'popular_creator':
      return {
        title: `${creator.username.toUpperCase()} is hosting an event! 🎤`,
        body: `${creator.username.toUpperCase()} has a ${event.category} on ${naturalDate}! book now!`,
        data: {
          type: 'event',
          eventId: event.id,
          creatorId: creator.id,
          deepLink: `soundbridge://event/${event.id}`,
        },
      };
      
    case 'multiple_events':
      return {
        title: `Multiple Events in ${event.state}! 🎊`,
        body: `There are ${eventsCount} ${event.category} events lined up at ${event.location} on ${naturalDate}`,
        data: {
          type: 'event_collection',
          eventIds: [event.id],
          location: event.state,
          deepLink: `soundbridge://events?location=${event.state}&category=${event.category}`,
        },
      };
      
    case 'urgent':
      const hours = getHoursUntilEvent(event.event_date);
      const timeText = hours < 24 ? `${hours} hours` : `${Math.floor(hours / 24)} days`;
      return {
        title: 'Event Starting Soon! ⚡',
        body: `⚡ ${event.title} starts in ${timeText} at ${event.location}! Last chance to book!`,
        data: {
          type: 'event',
          eventId: event.id,
          urgency: 'high',
          deepLink: `soundbridge://event/${event.id}`,
        },
      };
      
    case 'creator_followed':
      return {
        title: `${creator.username} Posted a New Event! 📅`,
        body: `📅 ${creator.username} just posted a new event: ${event.title} on ${naturalDate}!`,
        data: {
          type: 'event',
          eventId: event.id,
          creatorId: creator.id,
          deepLink: `soundbridge://event/${event.id}`,
        },
      };
      
    default:
      return {
        title: 'New Event 🎉',
        body: `${event.title} on ${naturalDate} at ${event.location}`,
        data: {
          type: 'event',
          eventId: event.id,
          deepLink: `soundbridge://event/${event.id}`,
        },
      };
  }
}

/**
 * Generate tip notification
 */
export function generateTipNotification(
  amount: number,
  currency: string,
  senderUsername: string,
  trackName?: string
): EventNotificationContent {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
  
  if (trackName) {
    return {
      title: 'New Tip! 🎉',
      body: `🎉 ${senderUsername} just tipped you ${formattedAmount} on '${trackName}'!`,
      data: {
        type: 'tip',
        amount,
        currency,
        senderId: '',
        deepLink: 'soundbridge://wallet/tips',
      },
    };
  }
  
  return {
    title: 'You Received a Tip! 💰',
    body: `💰 You received a ${formattedAmount} tip from ${senderUsername}!`,
    data: {
      type: 'tip',
      amount,
      currency,
      senderId: '',
      deepLink: 'soundbridge://wallet/tips',
    },
  };
}

/**
 * Generate message notification
 */
export function generateMessageNotification(
  senderUsername: string,
  messagePreview: string,
  conversationId: string
): EventNotificationContent {
  const preview = messagePreview.length > 50 
    ? messagePreview.substring(0, 50) + '...' 
    : messagePreview;
  
  return {
    title: `${senderUsername}`,
    body: `📩 ${senderUsername}: ${preview}`,
    data: {
      type: 'message',
      conversationId,
      senderId: '',
      deepLink: `soundbridge://messages/${conversationId}`,
    },
  };
}

/**
 * Generate collaboration notification
 */
export function generateCollaborationNotification(
  type: 'request' | 'accepted' | 'declined' | 'confirmed',
  username: string,
  date: string,
  requestId: string,
  timezone: string
): EventNotificationContent {
  const naturalDate = formatNaturalDate(date, timezone);
  
  switch (type) {
    case 'request':
      return {
        title: 'New Collaboration Request! 🤝',
        body: `🤝 ${username} wants to collaborate with you on ${naturalDate}`,
        data: {
          type: 'collaboration_request',
          requestId,
          requesterId: '',
          deepLink: `soundbridge://collaboration/${requestId}`,
        },
      };
      
    case 'accepted':
      return {
        title: 'Collaboration Accepted! 🎉',
        body: `🤝 ${username} accepted your collaboration request for ${naturalDate}!`,
        data: {
          type: 'collaboration_accepted',
          requestId,
          deepLink: `soundbridge://collaboration/${requestId}`,
        },
      };
      
    case 'declined':
      return {
        title: 'Collaboration Update',
        body: `${username} declined your collaboration request`,
        data: {
          type: 'collaboration_declined',
          requestId,
        },
      };
      
    case 'confirmed':
      return {
        title: 'Collaboration Confirmed! ✅',
        body: `✅ Your collaboration with ${username} is confirmed for ${naturalDate}`,
        data: {
          type: 'collaboration_confirmed',
          requestId,
          deepLink: `soundbridge://collaboration/${requestId}`,
        },
      };
  }
}

/**
 * Generate wallet notification
 */
export function generateWalletNotification(
  type: 'withdrawal_processed' | 'funds_coming',
  amount: number,
  currency: string,
  withdrawalId?: string
): EventNotificationContent {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
  
  if (type === 'withdrawal_processed') {
    return {
      title: 'Withdrawal Processed! ✅',
      body: `✅ Your withdrawal of ${formattedAmount} has been processed`,
      data: {
        type: 'withdrawal',
        withdrawalId: withdrawalId || '',
        amount,
        currency,
        deepLink: `soundbridge://wallet/withdrawal/${withdrawalId}`,
      },
    };
  }
  
  return {
    title: 'Funds on the Way 💳',
    body: `💳 Funds arriving in 3-5 business days: ${formattedAmount}`,
    data: {
      type: 'withdrawal',
      withdrawalId: withdrawalId || '',
      amount,
      currency,
      deepLink: `soundbridge://wallet/withdrawal/${withdrawalId}`,
    },
  };
}

/**
 * Generate track approval notification
 */
export function generateTrackApprovalNotification(
  type: 'live' | 'featured' | 'approved',
  trackName: string,
  trackId: string,
  playlistName?: string
): EventNotificationContent {
  switch (type) {
    case 'live':
      return {
        title: 'Your Track is Live! 🎵',
        body: `🎵 Your track '${trackName}' is now live!`,
        data: {
          type: 'track_approved',
          trackId,
          deepLink: `soundbridge://track/${trackId}`,
        },
      };
      
    case 'featured':
      return {
        title: "You're Featured! ⭐",
        body: `⭐ Great news! '${trackName}' was featured in ${playlistName}`,
        data: {
          type: 'track_approved',
          trackId,
          deepLink: `soundbridge://track/${trackId}`,
        },
      };
      
    case 'approved':
      return {
        title: 'Upload Approved! ✅',
        body: `✅ Your upload '${trackName}' has been approved`,
        data: {
          type: 'track_approved',
          trackId,
          deepLink: `soundbridge://track/${trackId}`,
        },
      };
  }
}

/**
 * Generate event reminder notification
 */
export function generateEventReminderNotification(
  eventName: string,
  eventId: string,
  hoursUntil: number,
  time: string
): EventNotificationContent {
  if (hoursUntil === 24) {
    return {
      title: 'Event Tomorrow! ⏰',
      body: `⏰ Don't forget! ${eventName} is tomorrow at ${time}`,
      data: {
        type: 'event_reminder',
        eventId,
        deepLink: `soundbridge://event/${eventId}`,
      },
    };
  }
  
  return {
    title: 'Event Starting Soon! 🎟️',
    body: `🎟️ Your event '${eventName}' starts in ${hoursUntil} hours!`,
    data: {
      type: 'event_reminder',
      eventId,
      deepLink: `soundbridge://event/${eventId}`,
    },
  };
}

