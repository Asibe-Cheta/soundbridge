/**
 * POST /api/upload/verify-isrc
 * 
 * Verify ISRC code via MusicBrainz API
 * This endpoint handles ISRC verification for cover songs
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyISRC, getCachedISRC, setCachedISRC } from '@/src/lib/musicbrainz-api';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (optional - can be public endpoint, but good to track)
    const { user } = await getSupabaseRouteClient(request, false);
    
    const body = await request.json();
    const { isrc } = body;

    if (!isrc || typeof isrc !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'ISRC code is required'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check cache first
    const cached = getCachedISRC(isrc);
    if (cached) {
      console.log('✅ ISRC verification cache hit:', isrc);
      return NextResponse.json(
        {
          success: cached.verified,
          verified: cached.verified,
          recording: cached.recording || null,
          error: cached.error || null,
          errorCode: cached.errorCode || null,
          cached: true
        },
        { headers: corsHeaders }
      );
    }

    // Verify ISRC via MusicBrainz
    console.log('🔍 Verifying ISRC:', isrc);
    const result = await verifyISRC(isrc, 10000); // 10 second timeout

    // Cache successful verifications
    if (result.verified) {
      setCachedISRC(isrc, result);
    }

    return NextResponse.json(
      {
        success: result.verified,
        verified: result.verified,
        recording: result.recording || null,
        error: result.error || null,
        errorCode: result.errorCode || null,
        cached: false
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ ISRC verification error:', error);
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify ISRC',
        errorCode: 'API_ERROR'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

