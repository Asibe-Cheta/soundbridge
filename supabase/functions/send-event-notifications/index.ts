import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'
import {
  daysUntilEvent,
  getNextPreferredNotificationTime,
  getPlanningWindowAction,
  getPlanningWindowScheduleDate,
  isInPreferredNotificationTime,
  matchesActiveEventMonths,
  maxScheduleDate,
} from './_lib/notification-timing.ts'

// Define types
interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  image_url: string | null;
  creator: {
    username: string;
    display_name: string | null;
  };
}

interface EligibleUser {
  user_id: string;
  expo_push_token: string;
  username: string;
  display_name: string | null;
  city: string;
  distance_km: number | null;
  preferred_categories: string[];
  start_hour: number;
  end_hour: number;
  timezone: string | null;
  preferred_notification_times: string[] | null;
  event_planning_window: string | null;
  active_event_months: number[] | null;
}

interface PendingSchedule {
  user_id: string;
  username: string;
  scheduled_for: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

// Constants
const MAX_DISTANCE_KM = 20;
const DAILY_NOTIFICATION_LIMIT = 3;

function formatNaturalDate(eventDate: string): string {
  const event = new Date(eventDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(event.getFullYear(), event.getMonth(), event.getDate());
  const diffDays = Math.round(
    (startOfEventDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;

  return event.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getEventCity(event: Event): string {
  if (event?.city) return event.city;
  if (event?.location) {
    const parts = event.location.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts[1];
    if (parts.length > 0) return parts[0];
  }
  return 'your area';
}

function getCTA(event: Event): string {
  const isPaid = (event as any)?.price_gbp > 0 || (event as any)?.price_ngn > 0;
  const maxAttendees = (event as any)?.max_attendees ?? 0;
  const currentAttendees = (event as any)?.current_attendees ?? 0;
  const hasLimitedSpots = maxAttendees > 0 && currentAttendees >= maxAttendees * 0.8;

  if (hasLimitedSpots && isPaid) return 'Limited spots - get your ticket!';
  if (hasLimitedSpots && !isPaid) return 'Limited spots - check in now!';
  if (isPaid) {
    const paidCTAs = ['Get your ticket!', 'Reserve your spot!', 'Grab your ticket now!'];
    return paidCTAs[Math.floor(Math.random() * paidCTAs.length)];
  }
  const freeCTAs = ['RSVP now!', 'Join the event!', 'Save your spot!'];
  return freeCTAs[Math.floor(Math.random() * freeCTAs.length)];
}

function buildEventNotification(event: Event, creatorName: string) {
  const city = getEventCity(event);
  const naturalDate = formatNaturalDate(event.event_date);
  const cta = getCTA(event);

  const eventDate = new Date(event.event_date);
  const daysUntil =
    (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  if (isUrgent) {
    return {
      title: `Don't miss out! ${creatorName}'s ${event.category} is ${naturalDate}`,
      body: `${event.title} in ${city}. Limited spots available!`,
    };
  }

  const templateType = Math.floor(Math.random() * 5);
  switch (templateType) {
    case 0:
      return {
        title: `${creatorName} is hosting a ${event.category} ${naturalDate}!`,
        body: `${event.title} in ${city}. ${cta}`,
      };
    case 1:
      return {
        title: `${creatorName} has a ${event.category} coming up!`,
        body: `${event.title} in ${city} ${naturalDate}. ${cta}`,
      };
    case 2:
      return {
        title: `Hey! ${creatorName} has something for you`,
        body: `${event.category}: ${event.title} in ${city} ${naturalDate}`,
      };
    case 3:
      return {
        title: `${event.category} happening in ${city} ${naturalDate}!`,
        body: `${creatorName} presents: ${event.title}. ${cta}`,
      };
    case 4:
    default:
      return {
        title: `${event.title} - ${naturalDate}`,
        body: `${creatorName}'s ${event.category} in ${city}. ${cta}`,
      };
  }
}

serve(async (req) => {
  try {
    // Parse request body
    const { record } = await req.json();
    console.log('🔔 Event created webhook triggered:', record.id);

    // Validate event has required fields
    if (!record.city && !record.latitude) {
      console.warn('⚠️ Event missing city and coordinates, skipping notifications');
      return new Response(
        JSON.stringify({ success: false, reason: 'No location data' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!record.category) {
      console.warn('⚠️ Event missing category, skipping notifications');
      return new Response(
        JSON.stringify({ success: false, reason: 'No category' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get event with creator details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, creator:profiles!creator_id(username, display_name)')
      .eq('id', record.id)
      .single();

    if (eventError || !event) {
      console.error('❌ Error fetching event:', eventError);
      return new Response(
        JSON.stringify({ success: false, error: eventError?.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Find nearby users using database function
    const { data: nearbyUsers, error: usersError } = await supabase
      .rpc('find_nearby_users_for_event', {
        p_event_id: event.id,
        p_max_distance_km: MAX_DISTANCE_KM
      });

    if (usersError) {
      console.error('❌ Error finding nearby users:', usersError);
      return new Response(
        JSON.stringify({ success: false, error: usersError.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!nearbyUsers || nearbyUsers.length === 0) {
      console.log('ℹ️ No nearby users found for event:', event.id);
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📍 Found ${nearbyUsers.length} nearby users in ${event.city}`);

    const creatorName = event.creator.display_name || event.creator.username;
    const deepLink = `soundbridge://event/${event.id}`;
    const { title, body } = buildEventNotification(event, creatorName);
    const eventDate = new Date(event.event_date);
    const daysUntil = daysUntilEvent(eventDate);
    const now = new Date();

    const notificationPayload = {
      type: 'event',
      eventId: event.id,
      eventTitle: event.title,
      eventCategory: event.category,
      eventLocation: event.location,
      city: event.city,
      creatorName,
      deepLink,
      url: deepLink,
    };

    const eligibleUsers: EligibleUser[] = [];
    const scheduledUsers: PendingSchedule[] = [];
    let skippedCount = 0;

    for (const user of nearbyUsers as EligibleUser[]) {
      const timezone = user.timezone || 'UTC';

      if (!matchesActiveEventMonths(user.active_event_months, eventDate, timezone)) {
        console.log(`📅 User ${user.username} active_event_months filter, skipping`);
        skippedCount++;
        continue;
      }

      const planningAction = getPlanningWindowAction(user.event_planning_window, daysUntil);
      if (planningAction === 'skip') {
        console.log(`📆 User ${user.username} outside planning window (${user.event_planning_window}), skipping`);
        skippedCount++;
        continue;
      }

      const planningSchedule =
        planningAction === 'schedule'
          ? getPlanningWindowScheduleDate(user.event_planning_window, eventDate)
          : null;

      const inPreferredTime = isInPreferredNotificationTime(
        user.preferred_notification_times,
        timezone,
        user.start_hour,
        user.end_hour,
        now,
      );

      const timeSchedule = inPreferredTime
        ? null
        : getNextPreferredNotificationTime(
            user.preferred_notification_times,
            timezone,
            user.start_hour,
            user.end_hour,
            now,
          );

      const deferUntil =
        planningSchedule || timeSchedule
          ? maxScheduleDate(planningSchedule, timeSchedule, now)
          : null;

      if (deferUntil && deferUntil > now) {
        scheduledUsers.push({
          user_id: user.user_id,
          username: user.username,
          scheduled_for: deferUntil.toISOString(),
          title,
          body,
          data: { ...notificationPayload, distance: user.distance_km },
        });
        continue;
      }

      if (!inPreferredTime) {
        console.log(`⏰ User ${user.username} outside preferred notification time, skipping`);
        skippedCount++;
        continue;
      }

      const { data: canSend } = await supabase.rpc('check_notification_quota', {
        p_user_id: user.user_id,
        p_daily_limit: DAILY_NOTIFICATION_LIMIT,
      });

      if (!canSend) {
        console.log(`🚫 User ${user.username} reached daily limit, skipping`);
        skippedCount++;
        continue;
      }

      eligibleUsers.push(user);
    }

    for (const pending of scheduledUsers) {
      const { error: scheduleError } = await supabase.from('scheduled_notifications').upsert(
        {
          user_id: pending.user_id,
          event_id: event.id,
          notification_type: 'event_new',
          scheduled_for: pending.scheduled_for,
          status: 'pending',
          title: pending.title,
          body: pending.body,
          data: pending.data,
        },
        { onConflict: 'user_id,event_id,notification_type' },
      );

      if (scheduleError) {
        console.warn(`⚠️ Could not schedule for ${pending.username}:`, scheduleError.message);
      } else {
        console.log(`🗓️ Scheduled event notification for ${pending.username} at ${pending.scheduled_for}`);
      }
    }

    console.log(
      `✅ ${eligibleUsers.length} send now, ${scheduledUsers.length} scheduled, ${skippedCount} skipped`,
    );

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          notificationsSent: 0,
          scheduled: scheduledUsers.length,
          skipped: skippedCount,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const messages = eligibleUsers.map((user) => ({
      to: user.expo_push_token,
      sound: 'default',
      title,
      body,
      data: {
        ...notificationPayload,
        distance: user.distance_km,
      },
      url: deepLink,
      channelId: 'events',
    }));

    const results = await sendPushNotifications(messages);

    for (let i = 0; i < eligibleUsers.length; i++) {
      const user = eligibleUsers[i];
      const result = results[i];

      await supabase.rpc('record_notification_sent', {
        p_user_id: user.user_id,
        p_event_id: event.id,
        p_type: 'event',
        p_title: messages[i].title,
        p_body: messages[i].body,
        p_data: JSON.stringify(messages[i].data)
      });

      // Dual-write to notifications table so in-app list and bell badge show event notifications (mobile)
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: user.user_id,
        type: 'event',
        title: messages[i].title,
        body: messages[i].body,
        data: messages[i].data,
        read: false
      });
      if (notifErr) {
        console.warn(`⚠️ Could not write to notifications table for ${user.username}:`, notifErr.message);
      }

      // Log individual result
      if (result.status === 'ok') {
        console.log(`✉️ Sent to ${user.username} (${user.city}, ${user.distance_km}km)`);
      } else {
        console.error(`❌ Failed to send to ${user.username}:`, result.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: eligibleUsers.length,
        scheduled: scheduledUsers.length,
        skipped: skippedCount,
        event: {
          id: event.id,
          title: event.title,
          city: event.city,
          category: event.category,
        },
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
