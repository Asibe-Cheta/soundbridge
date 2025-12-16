/**
 * GET /api/profile
 * 
 * Get user profile data
 * 
 * Query Parameters:
 * - user_id: User ID to fetch profile for (optional, defaults to authenticated user)
 * 
 * Response:
 * {
 *   "success": true,
 *   "profile": {
 *     "id": "uuid",
 *     "username": "string",
 *     "display_name": "string",
 *     "avatar_url": "string",
 *     "professional_headline": "string",
 *     ...
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user with timeout
    const authPromise = getSupabaseRouteClient(request, true);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication timeout')), 5000);
    });

    const { supabase, user, error: authError } = await Promise.race([
      authPromise,
      timeoutPromise
    ]) as any;

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;

    // If requesting another user's profile, check if it's allowed
    // For now, allow users to view any profile (can add restrictions later)
    const targetUserId = userId === user.id ? user.id : userId;

    // Get profile with timeout
    const queryPromise = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, professional_headline, location, bio, website, phone, genres, experience_level, followers_count, following_count, total_plays, subscription_tier')
      .eq('id', targetUserId)
      .single();

    const queryTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 8000);
    });

    const { data: profile, error: profileError } = await Promise.race([
      queryPromise,
      queryTimeout
    ]) as any;

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ Profile query completed in ${elapsed}ms`);

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Profile not found', details: profileError.message },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        profile,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

