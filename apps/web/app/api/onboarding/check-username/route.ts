import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Check Username API called');

    // Parse request body
    const body = await request.json();
    const { username } = body;

    // Validate username is provided
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate username format
    const usernamePattern = /^[a-z0-9_]+$/;
    const trimmedUsername = username.toLowerCase().trim();

    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (trimmedUsername.length > 30) {
      return NextResponse.json(
        { success: false, error: 'Username must be no more than 30 characters' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!usernamePattern.test(trimmedUsername)) {
      return NextResponse.json(
        { success: false, error: 'Username can only contain lowercase letters, numbers, and underscores' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Supabase client (authentication optional for username checking)
    const { supabase } = await getSupabaseRouteClient(request, false);

    // Check if username exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking username:', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to check username availability' },
        { status: 500, headers: corsHeaders }
      );
    }

    const isAvailable = !existingProfile;

    // Generate suggestions if username is unavailable
    const suggestions: string[] = [];
    if (!isAvailable) {
      // Generate 3 alternative suggestions
      for (let i = 1; i <= 3; i++) {
        suggestions.push(`${trimmedUsername}${i}`);
      }
    }

    console.log('✅ Username check completed:', { username: trimmedUsername, available: isAvailable });

    return NextResponse.json({
      success: true,
      available: isAvailable,
      suggestions: suggestions
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error checking username:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
