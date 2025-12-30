import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

// GET user's genre preferences
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ✅ Use helper function instead of direct query
    const { data: userGenres, error } = await supabase
      .rpc('get_user_preferred_genres', { user_uuid: userId });

    if (error) {
      console.error('Error fetching user genres:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user genres', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Fetched ${userGenres?.length || 0} genre preferences for user ${userId}`);

    // Return genre names as array (matching mobile app expectations)
    return NextResponse.json({
      success: true,
      genres: userGenres?.map((g: any) => g.genre_name) || [],
      count: userGenres?.length || 0,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error fetching user genres:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST/UPDATE user's genre preferences
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { genre_ids } = body;

    // Validation
    if (!genre_ids || !Array.isArray(genre_ids)) {
      return NextResponse.json(
        { error: 'genre_ids must be an array' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (genre_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one genre must be selected' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (genre_ids.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 genres can be selected' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client (helper function handles auth via SECURITY DEFINER)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ✅ Use helper function instead of manual delete + insert (atomic operation)
    const { error } = await supabase.rpc('set_user_preferred_genres', {
      user_uuid: userId,
      genre_ids: genre_ids
    });

    if (error) {
      console.error('Error setting user genres:', error);
      return NextResponse.json(
        { error: 'Failed to save genre preferences', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Updated ${genre_ids.length} genre preferences for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
      count: genre_ids.length,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error updating user genres:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}
