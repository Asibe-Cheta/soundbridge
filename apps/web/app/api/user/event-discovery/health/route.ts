import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, latitude, longitude, preferred_event_distance')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    // Prefer notification_preferences (aligned with mobile); fallback to user_notification_preferences
    let prefs: { preferred_event_genres?: string[]; location_state?: string; location_country?: string; event_notifications_enabled?: boolean } | null = null;
    const { data: np } = await supabase
      .from('notification_preferences')
      .select('preferred_event_genres, location_state, location_country, event_notifications_enabled')
      .eq('user_id', user.id)
      .single();
    if (np) prefs = np as typeof prefs;
    if (!prefs) {
      const { data: unp } = await supabase
        .from('user_notification_preferences')
        .select('preferred_event_genres, location_state, location_country, event_notifications_enabled')
        .eq('user_id', user.id)
        .single();
      if (unp) prefs = unp as typeof prefs;
    }

    return NextResponse.json({
      userId: user.id,
      latitude: profile?.latitude ?? null,
      longitude: profile?.longitude ?? null,
      preferredEventDistance: profile?.preferred_event_distance ?? null,
      preferredEventGenres: prefs?.preferred_event_genres ?? [],
      locationState: prefs?.location_state ?? null,
      locationCountry: prefs?.location_country ?? null,
      eventNotificationsEnabled: prefs?.event_notifications_enabled ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
