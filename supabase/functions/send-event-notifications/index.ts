import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'
import { isWithinTimeWindow } from './_lib/time-window.ts'

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
}

// Constants
const MAX_DISTANCE_KM = 20;
const DAILY_NOTIFICATION_LIMIT = 3;

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

    // Filter users by time window and daily quota
    const eligibleUsers: EligibleUser[] = [];

    for (const user of nearbyUsers as EligibleUser[]) {
      // Check time window
      if (!isWithinTimeWindow(user.start_hour, user.end_hour)) {
        console.log(`⏰ User ${user.username} outside time window, skipping`);
        continue;
      }

      // Check daily quota
      const { data: canSend } = await supabase
        .rpc('check_notification_quota', {
          p_user_id: user.user_id,
          p_daily_limit: DAILY_NOTIFICATION_LIMIT
        });

      if (!canSend) {
        console.log(`🚫 User ${user.username} reached daily limit, skipping`);
        continue;
      }

      eligibleUsers.push(user);
    }

    console.log(`✅ ${eligibleUsers.length} users eligible for notifications`);

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Build notification messages
    const creatorName = event.creator.display_name || event.creator.username;
    const eventDate = new Date(event.event_date).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const messages = eligibleUsers.map(user => ({
      to: user.expo_push_token,
      sound: 'default',
      title: `New ${event.category} in ${event.city}!`,
      body: `${event.title} on ${eventDate}`,
      data: {
        type: 'event',
        eventId: event.id,
        eventTitle: event.title,
        eventCategory: event.category,
        eventLocation: event.location,
        city: event.city,
        creatorName: creatorName,
        distance: user.distance_km,
        deepLink: `soundbridge://event/${event.id}`
      },
      channelId: 'events'
    }));

    // Send push notifications via Expo
    const results = await sendPushNotifications(messages);

    // Record notification history
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
        event: {
          id: event.id,
          title: event.title,
          city: event.city,
          category: event.category
        }
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
