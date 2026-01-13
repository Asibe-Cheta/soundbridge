/**
 * External Link Click Tracking API
 *
 * POST - Track when a user clicks an external link
 *
 * MOBILE TEAM INTEGRATION NOTES:
 * - This endpoint does NOT require authentication (anonymous tracking supported)
 * - Call this BEFORE opening the external URL
 * - Rate limiting prevents spam (same session can't increment twice within 5 minutes)
 * - Tracks: linkId, sessionId, deviceType, platform
 * - Uses RPC function for atomic increment
 *
 * Request format:
 * {
 *   "linkId": "uuid",
 *   "sessionId": "uuid", // Generate once per app session
 *   "deviceType": "mobile" | "desktop" | "tablet",
 *   "platform": "web" | "ios" | "android"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createBrowserClient();
    const body = await request.json();
    const { linkId, sessionId, deviceType, platform } = body;

    if (!linkId) {
      return NextResponse.json(
        { success: false, error: 'linkId is required' },
        { status: 400 }
      );
    }

    // Get current user (optional - works for anonymous users)
    const { data: { user } } = await supabase.auth.getUser();

    // Track click using RPC function (atomic increment + insert)
    const { data, error } = await supabase.rpc('track_external_link_click', {
      p_link_id: linkId,
      p_user_id: user?.id || null,
      p_session_id: sessionId || null,
      p_device_type: deviceType || null,
      p_platform: platform || 'web'
    });

    if (error) {
      console.error('Error tracking external link click:', error);
      // Don't fail the request if tracking fails (graceful degradation)
      return NextResponse.json({
        success: true,
        data: { tracked: false, reason: error.message }
      });
    }

    return NextResponse.json({
      success: true,
      data: { tracked: data === true }
    });
  } catch (error: any) {
    console.error('Error in external link click tracking:', error);
    // Gracefully handle errors - don't block user from opening link
    return NextResponse.json({
      success: true,
      data: { tracked: false, reason: 'Internal error' }
    });
  }
}
