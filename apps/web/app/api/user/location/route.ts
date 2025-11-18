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
    const { locationState, locationCountry, source } = await request.json();
    
    // Validate inputs
    if (!locationState || !locationCountry) {
      return NextResponse.json(
        { error: 'locationState and locationCountry are required' },
        { status: 400 }
      );
    }
    
    if (source && !['gps', 'manual'].includes(source)) {
      return NextResponse.json(
        { error: 'source must be gps or manual' },
        { status: 400 }
      );
    }
    
    // Update location
    const { error } = await supabase
      .from('user_notification_preferences')
      .update({
        location_state: locationState,
        location_country: locationCountry,
      })
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating location:', error);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Location updated for user ${user.id}: ${locationState}, ${locationCountry}`);
    
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

