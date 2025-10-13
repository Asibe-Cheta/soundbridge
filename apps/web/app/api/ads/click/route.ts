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
      session_id
    } = body;
    
    // Validate required fields
    if (!ad_id) {
      return NextResponse.json(
        { error: 'Missing required field: ad_id' },
        { status: 400 }
      );
    }
    
    // Track ad click using database function
    const { data, error } = await supabase.rpc('track_ad_click', {
      p_ad_id: ad_id,
      p_user_id: userId,
      p_session_id: session_id
    });
    
    if (error) {
      console.error('Error tracking ad click:', error);
      return NextResponse.json(
        { error: 'Failed to track ad click', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`✅ Ad click tracked: ${ad_id} - User: ${userId || 'anonymous'}`);
    
    return NextResponse.json({
      success: true,
      tracked: data,
      message: 'Ad click tracked successfully'
    });
    
  } catch (error) {
    console.error('Error in ad click API:', error);
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

