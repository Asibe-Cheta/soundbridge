import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

interface StreamEventPayload {
  trackId: string;
  durationListened: number; // seconds
  totalDuration: number; // seconds
  ipAddress?: string;
  referrerUrl?: string;
  referrerType?: 'direct' | 'social' | 'search' | 'external' | 'internal';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  platform?: 'ios' | 'android' | 'web';
  userAgent?: string;
  likedTrack?: boolean;
  sharedTrack?: boolean;
  followedCreator?: boolean;
  tippedCreator?: boolean;
  purchasedTicket?: boolean;
  sessionId?: string;
}

/**
 * POST /api/analytics/stream-event
 * Log a stream event for analytics tracking (Premium/Unlimited feature)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional - can track anonymous plays)
    const { supabase, user } = await getSupabaseRouteClient(request, false);

    // Parse request body
    const body: StreamEventPayload = await request.json();
    const {
      trackId,
      durationListened,
      totalDuration,
      referrerUrl,
      referrerType,
      utmSource,
      utmMedium,
      utmCampaign,
      deviceType,
      platform,
      userAgent,
      likedTrack = false,
      sharedTrack = false,
      followedCreator = false,
      tippedCreator = false,
      purchasedTicket = false,
      sessionId,
    } = body;

    // Validate required fields
    if (!trackId || durationListened === undefined || totalDuration === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: trackId, durationListened, totalDuration' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get track info to find creator
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('creator_id')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get IP address from request headers
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;

    // Get geographic data from IP (using a GeoIP service - to be implemented)
    const geoData = ipAddress ? await getGeoDataFromIP(ipAddress) : null;

    // Insert stream event
    const { error: insertError } = await supabase
      .from('stream_events')
      .insert({
        track_id: trackId,
        listener_id: user?.id || null,
        creator_id: track.creator_id,
        duration_listened: durationListened,
        total_duration: totalDuration,
        ip_address: ipAddress,
        country_code: geoData?.countryCode,
        country_name: geoData?.countryName,
        city: geoData?.city,
        region: geoData?.region,
        latitude: geoData?.latitude,
        longitude: geoData?.longitude,
        timezone: geoData?.timezone,
        referrer_url: referrerUrl,
        referrer_type: referrerType,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        device_type: deviceType,
        platform: platform,
        user_agent: userAgent || request.headers.get('user-agent'),
        liked_track: likedTrack,
        shared_track: sharedTrack,
        followed_creator: followedCreator,
        tipped_creator: tippedCreator,
        purchased_ticket: purchasedTicket,
        session_id: sessionId,
      });

    if (insertError) {
      console.error('Error inserting stream event:', insertError);
      return NextResponse.json(
        { error: 'Failed to log stream event', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Also increment the basic play_count on the track (for Free tier analytics)
    const { error: updateError } = await supabase.rpc('increment_play_count', {
      track_id: trackId,
    });

    if (updateError) {
      console.error('Error incrementing play count:', updateError);
      // Don't fail the request if this fails
    }

    return NextResponse.json(
      { success: true, message: 'Stream event logged successfully' },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error logging stream event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Get geographic data from IP address
 * Uses ipapi.co free tier (1,000 requests/day, then 30,000/month for $12)
 * Alternative: ip-api.com (45 requests/minute free)
 */
async function getGeoDataFromIP(ipAddress: string): Promise<{
  countryCode: string;
  countryName: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
} | null> {
  try {
    // For development/localhost, return null
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.')) {
      return null;
    }

    // Use ip-api.com (free, no API key required, 45 req/min)
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,city,lat,lon,timezone`, {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      console.error('GeoIP lookup failed:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success') {
      console.error('GeoIP lookup failed:', data.message);
      return null;
    }

    return {
      countryCode: data.countryCode,
      countryName: data.country,
      city: data.city,
      region: data.region,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
    };

  } catch (error) {
    console.error('Error fetching geo data:', error);
    return null;
  }
}
