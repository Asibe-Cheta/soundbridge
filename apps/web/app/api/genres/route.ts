import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  'Content-Type': 'application/json',
} as const;

function jsonResponse(body: object, status = 200, headers = CORS_HEADERS) {
  return NextResponse.json(body, { status, headers: { ...headers } });
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Genres API: missing Supabase env vars');
      return jsonResponse(
        { success: false, error: 'Service unavailable', genres: [] },
        503
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'music' or 'podcast'
    const active = searchParams.get('active') !== 'false'; // default true

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Build query
    let query = supabase
      .from('genres')
      .select('*')
      .eq('is_active', active)
      .order('sort_order', { ascending: true });

    // Filter by category if provided
    if (category && ['music', 'podcast'].includes(category)) {
      query = query.eq('category', category);
    }

    const { data: genres, error } = await query;

    if (error) {
      console.error('Error fetching genres:', error);
      return jsonResponse(
        { success: false, error: 'Failed to fetch genres', genres: [] },
        500
      );
    }

    console.log(`✅ Fetched ${genres?.length || 0} genres (category: ${category || 'all'})`);

    return jsonResponse({
      success: true,
      genres: genres || [],
      count: genres?.length || 0,
      category: category || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Unexpected error fetching genres:', err);
    return jsonResponse(
      { success: false, error: 'Internal server error', genres: [] },
      500
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: CORS_HEADERS });
}
