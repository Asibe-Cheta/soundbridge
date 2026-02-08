/**
 * API Endpoint: Notification Preferences
 * GET/PUT /api/user/notification-preferences
 *
 * Uses notification_preferences (single source of truth with mobile).
 * Falls back to user_notification_preferences for GET when no row in notification_preferences.
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

/** Map notification_preferences row to API response shape */
function mapToResponse(prefs: Record<string, unknown> | null) {
  if (!prefs) return null;
  return {
    notificationsEnabled: prefs.enabled ?? prefs.notifications_enabled ?? true,
    notificationStartHour: prefs.start_hour ?? prefs.notification_start_hour ?? 8,
    notificationEndHour: prefs.end_hour ?? prefs.notification_end_hour ?? 22,
    timezone: prefs.timezone ?? 'UTC',
    maxNotificationsPerDay: prefs.max_notifications_per_day ?? 10,
    notificationCountToday: prefs.notification_count_today ?? 0,
    eventNotificationsEnabled: prefs.event_notifications_enabled ?? true,
    messageNotificationsEnabled: prefs.message_notifications_enabled ?? true,
    tipNotificationsEnabled: prefs.tip_notifications_enabled ?? true,
    collaborationNotificationsEnabled: prefs.collaboration_notifications_enabled ?? true,
    walletNotificationsEnabled: prefs.wallet_notifications_enabled ?? true,
    preferredEventGenres: prefs.preferred_event_genres ?? [],
    locationState: prefs.location_state ?? null,
    locationCountry: prefs.location_country ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Prefer notification_preferences (aligned with mobile and find_nearby_users)
    let { data: np, error: npError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (np && !npError) {
      return NextResponse.json(mapToResponse(np as Record<string, unknown>));
    }

    // Fallback: user_notification_preferences (legacy)
    const { data: unp, error: unpError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (unpError && unpError.code === 'PGRST116') {
      return NextResponse.json(
        mapToResponse({
          enabled: true,
          start_hour: 8,
          end_hour: 22,
          timezone: 'UTC',
          event_notifications_enabled: true,
          message_notifications_enabled: true,
          tip_notifications_enabled: true,
          collaboration_notifications_enabled: true,
          wallet_notifications_enabled: true,
          preferred_event_genres: [],
        })
      );
    }
    if (unpError) {
      console.error('Error fetching notification preferences:', unpError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapToResponse(unp as Record<string, unknown>));
  } catch (error: unknown) {
    console.error('GET notification preferences error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const updates = await request.json();

    const payload: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (updates.notificationsEnabled !== undefined) payload.enabled = updates.notificationsEnabled;
    if (updates.notificationStartHour !== undefined) payload.start_hour = updates.notificationStartHour;
    if (updates.notificationEndHour !== undefined) payload.end_hour = updates.notificationEndHour;
    if (updates.timezone !== undefined) payload.timezone = updates.timezone;
    if (updates.eventNotificationsEnabled !== undefined) payload.event_notifications_enabled = updates.eventNotificationsEnabled;
    if (updates.messageNotificationsEnabled !== undefined) payload.message_notifications_enabled = updates.messageNotificationsEnabled;
    if (updates.tipNotificationsEnabled !== undefined) payload.tip_notifications_enabled = updates.tipNotificationsEnabled;
    if (updates.collaborationNotificationsEnabled !== undefined) payload.collaboration_notifications_enabled = updates.collaborationNotificationsEnabled;
    if (updates.walletNotificationsEnabled !== undefined) payload.wallet_notifications_enabled = updates.walletNotificationsEnabled;
    if (updates.preferredEventGenres !== undefined) payload.preferred_event_genres = updates.preferredEventGenres;
    if (updates.locationState !== undefined) payload.location_state = updates.locationState;
    if (updates.locationCountry !== undefined) payload.location_country = updates.locationCountry;

    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: mapToResponse(prefs as Record<string, unknown>),
    });
  } catch (error: unknown) {
    console.error('PUT notification preferences error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
