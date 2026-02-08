/**
 * API Endpoint: Update User Location
 * PUT /api/user/location
 * 
 * Update user's location for targeted notifications
 * 
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    console.log('📍 Update User Location: Starting...');
    
    // Get authenticated user
    const { supabase, user } = await getSupabaseRouteClient(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { latitude, longitude, locationState, locationCountry, source } = await request.json();

    // Validate inputs
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    const hasLocationText = locationState || locationCountry;

    if (!hasCoordinates && !hasLocationText) {
      return NextResponse.json(
        { error: 'latitude/longitude or locationState/locationCountry is required' },
        { status: 400 }
      );
    }

    if (hasCoordinates && (isNaN(Number(latitude)) || isNaN(Number(longitude)))) {
      return NextResponse.json(
        { error: 'latitude and longitude must be numbers' },
        { status: 400 }
      );
    }

    if (source && !['gps', 'manual'].includes(source)) {
      return NextResponse.json(
        { error: 'source must be gps or manual' },
        { status: 400 }
      );
    }

    if (hasCoordinates) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          latitude,
          longitude,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile location:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile location' },
          { status: 500 }
        );
      }
    }

    if (hasLocationText) {
      // Update notification_preferences (source of truth with mobile); fallback update legacy table
      const locationUpdate = { location_state: locationState, location_country: locationCountry, updated_at: new Date().toISOString() };
      const { error: npError } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, ...locationUpdate }, { onConflict: 'user_id' });

      if (npError) {
        const { error: unpError } = await supabase
          .from('user_notification_preferences')
          .update({ location_state: locationState, location_country: locationCountry })
          .eq('user_id', user.id);
        if (unpError) {
          console.error('Error updating notification location:', unpError);
          return NextResponse.json(
            { error: 'Failed to update notification location' },
            { status: 500 }
          );
        }
      }
    }
    
    if (error) {
      console.error('Error updating location:', error);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Location updated for user ${user.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating user location:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

