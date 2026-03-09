import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
  'Content-Type': 'application/json',
} as const;

function jsonResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Check Username API called');

    const body = await request.json().catch(() => ({}));
    const username = typeof body?.username === 'string' ? body.username : undefined;

    if (!username) {
      return jsonResponse({ success: false, error: 'Username is required' }, 400);
    }

    const usernamePattern = /^[a-z0-9_]+$/;
    const trimmedUsername = username.toLowerCase().trim();

    if (trimmedUsername.length < 3) {
      return jsonResponse({ success: false, error: 'Username must be at least 3 characters' }, 400);
    }
    if (trimmedUsername.length > 30) {
      return jsonResponse({ success: false, error: 'Username must be no more than 30 characters' }, 400);
    }
    if (!usernamePattern.test(trimmedUsername)) {
      return jsonResponse(
        { success: false, error: 'Username can only contain lowercase letters, numbers, and underscores' },
        400
      );
    }

    const { supabase } = await getSupabaseRouteClient(request, false);

    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking username:', checkError);
      return jsonResponse({ success: false, error: 'Failed to check username availability' }, 500);
    }

    const isAvailable = !existingProfile;
    const suggestions: string[] = !isAvailable
      ? [`${trimmedUsername}1`, `${trimmedUsername}2`, `${trimmedUsername}3`]
      : [];

    console.log('✅ Username check completed:', { username: trimmedUsername, available: isAvailable });

    return jsonResponse({
      success: true,
      available: isAvailable,
      suggestions,
    });
  } catch (err: unknown) {
    console.error('❌ Error checking username:', err);
    return jsonResponse(
      {
        success: false,
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
}
