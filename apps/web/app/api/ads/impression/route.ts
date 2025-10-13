import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;
    
    // Get request body
    const body = await request.json();
    const {
      ad_id,
      ad_type,
      placement,
      page_url,
      session_id
    } = body;
    
    // Validate required fields
    if (!ad_id || !ad_type) {
      return NextResponse.json(
        { error: 'Missing required fields: ad_id and ad_type' },
        { status: 400 }
      );
    }
    
    // Validate ad_type
    if (!['banner', 'interstitial'].includes(ad_type)) {
      return NextResponse.json(
        { error: 'Invalid ad_type. Must be "banner" or "interstitial"' },
        { status: 400 }
      );
    }
    
    // Get user agent and device info from headers
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const deviceType = getDeviceType(userAgent);
    
    // Track ad impression using database function
    const { data, error } = await supabase.rpc('track_ad_impression', {
      p_user_id: userId,
      p_ad_id: ad_id,
      p_ad_type: ad_type,
      p_page_url: page_url || request.headers.get('referer'),
      p_user_agent: userAgent,
      p_device_type: deviceType,
      p_placement: placement,
      p_session_id: session_id
    });
    
    if (error) {
      console.error('Error tracking ad impression:', error);
      return NextResponse.json(
        { error: 'Failed to track ad impression', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`✅ Ad impression tracked: ${ad_id} (${ad_type}) - User: ${userId || 'anonymous'}`);
    
    return NextResponse.json({
      success: true,
      impression_id: data,
      message: 'Ad impression tracked successfully'
    });
    
  } catch (error) {
    console.error('Error in ad impression API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Helper function to determine device type from user agent
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

