import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'music' or 'podcast'
    const active = searchParams.get('active') !== 'false'; // default true

    // Create Supabase client (no auth required for public genres)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
      return NextResponse.json(
        { error: 'Failed to fetch genres', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Fetched ${genres?.length || 0} genres (category: ${category || 'all'})`);

    return NextResponse.json({
      success: true,
      genres: genres || [],
      count: genres?.length || 0,
      category: category || 'all',
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error fetching genres:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    }
  });
}
