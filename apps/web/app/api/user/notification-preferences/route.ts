/**
 * API Endpoint: Notification Preferences
 * GET/PUT /api/user/notification-preferences
 * 
 * Get and update user notification preferences
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Get Notification Preferences: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get preferences
    let { data: prefs, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Create default preferences if they don't exist
    if (error && error.code === 'PGRST116') {
      const { data: newPrefs, error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: user.id,
          timezone: 'UTC',
        })
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Error creating preferences:', insertError);
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        );
      }
      
      prefs = newPrefs;
    } else if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Preferences fetched for user ${user.id}`);
    
    return NextResponse.json({
      notificationsEnabled: prefs!.notifications_enabled,
      notificationStartHour: prefs!.notification_start_hour,
      notificationEndHour: prefs!.notification_end_hour,
      timezone: prefs!.timezone,
      maxNotificationsPerDay: prefs!.max_notifications_per_day,
      notificationCountToday: prefs!.notification_count_today,
      eventNotificationsEnabled: prefs!.event_notifications_enabled,
      messageNotificationsEnabled: prefs!.message_notifications_enabled,
      tipNotificationsEnabled: prefs!.tip_notifications_enabled,
      collaborationNotificationsEnabled: prefs!.collaboration_notifications_enabled,
      walletNotificationsEnabled: prefs!.wallet_notifications_enabled,
      preferredEventGenres: prefs!.preferred_event_genres,
      locationState: prefs!.location_state,
      locationCountry: prefs!.location_country,
    });
  } catch (error: any) {
    console.error('❌ Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔔 Update Notification Preferences: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const updates = await request.json();
    
    // Build update object (only include provided fields)
    const updateData: any = {};
    
    if (updates.notificationsEnabled !== undefined) {
      updateData.notifications_enabled = updates.notificationsEnabled;
    }
    if (updates.notificationStartHour !== undefined) {
      updateData.notification_start_hour = updates.notificationStartHour;
    }
    if (updates.notificationEndHour !== undefined) {
      updateData.notification_end_hour = updates.notificationEndHour;
    }
    if (updates.timezone !== undefined) {
      updateData.timezone = updates.timezone;
    }
    if (updates.maxNotificationsPerDay !== undefined) {
      updateData.max_notifications_per_day = updates.maxNotificationsPerDay;
    }
    if (updates.eventNotificationsEnabled !== undefined) {
      updateData.event_notifications_enabled = updates.eventNotificationsEnabled;
    }
    if (updates.messageNotificationsEnabled !== undefined) {
      updateData.message_notifications_enabled = updates.messageNotificationsEnabled;
    }
    if (updates.tipNotificationsEnabled !== undefined) {
      updateData.tip_notifications_enabled = updates.tipNotificationsEnabled;
    }
    if (updates.collaborationNotificationsEnabled !== undefined) {
      updateData.collaboration_notifications_enabled = updates.collaborationNotificationsEnabled;
    }
    if (updates.walletNotificationsEnabled !== undefined) {
      updateData.wallet_notifications_enabled = updates.walletNotificationsEnabled;
    }
    if (updates.preferredEventGenres !== undefined) {
      updateData.preferred_event_genres = updates.preferredEventGenres;
    }
    if (updates.locationState !== undefined) {
      updateData.location_state = updates.locationState;
    }
    if (updates.locationCountry !== undefined) {
      updateData.location_country = updates.locationCountry;
    }
    
    // Update preferences
    const { data: prefs, error } = await supabase
      .from('user_notification_preferences')
      .update(updateData)
      .eq('user_id', user.id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Preferences updated for user ${user.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: {
        notificationsEnabled: prefs.notifications_enabled,
        notificationStartHour: prefs.notification_start_hour,
        notificationEndHour: prefs.notification_end_hour,
        timezone: prefs.timezone,
        maxNotificationsPerDay: prefs.max_notifications_per_day,
        notificationCountToday: prefs.notification_count_today,
        eventNotificationsEnabled: prefs.event_notifications_enabled,
        messageNotificationsEnabled: prefs.message_notifications_enabled,
        tipNotificationsEnabled: prefs.tip_notifications_enabled,
        collaborationNotificationsEnabled: prefs.collaboration_notifications_enabled,
        walletNotificationsEnabled: prefs.wallet_notifications_enabled,
        preferredEventGenres: prefs.preferred_event_genres,
        locationState: prefs.location_state,
        locationCountry: prefs.location_country,
      },
    });
  } catch (error: any) {
    console.error('❌ Error updating notification preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

