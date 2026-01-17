/**
 * API Endpoint: Location Health Check
 * GET /api/user/location/health
 *
 * Returns the user's stored coordinates for verification.
 * Authentication: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseRouteClient(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('latitude, longitude, location_updated_at')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      location: {
        latitude: data?.latitude ?? null,
        longitude: data?.longitude ?? null,
        locationUpdatedAt: data?.location_updated_at ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
