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
    const location = searchParams.get('location'); // City
    const country = searchParams.get('country'); // Country
    const category = searchParams.get('category') || 'music'; // 'music' or 'podcast'
    const limit = parseInt(searchParams.get('limit') || '10');

    // Create Supabase client with service role for function call
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the get_popular_genres_by_location function
    const { data: popularGenres, error } = await supabase
      .rpc('get_popular_genres_by_location', {
        p_country: country,
        p_location: location,
        p_category: category,
        p_limit: limit
      });

    if (error) {
      console.error('Error fetching popular genres:', error);
      return NextResponse.json(
        { error: 'Failed to fetch popular genres', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Found ${popularGenres?.length || 0} popular genres for ${location || country || 'global'}`);

    return NextResponse.json({
      success: true,
      genres: popularGenres || [],
      count: popularGenres?.length || 0,
      location: location || null,
      country: country || null,
      category: category,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error fetching popular genres:', error);
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
