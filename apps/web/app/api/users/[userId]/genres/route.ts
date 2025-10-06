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
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch user's genre preferences with genre details
    const { data: userGenres, error } = await supabase
      .from('user_genres')
      .select(`
        id,
        preference_strength,
        created_at,
        genre:genres!user_genres_genre_id_fkey(
          id,
          name,
          category,
          description
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user genres:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user genres', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Fetched ${userGenres?.length || 0} genre preferences for user ${userId}`);

    return NextResponse.json({
      success: true,
      genres: userGenres || [],
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
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
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

    // Create Supabase client with service role for writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Start transaction by deleting existing preferences
    const { error: deleteError } = await supabase
      .from('user_genres')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing genres:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update genres', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Insert new preferences
    const genrePreferences = genre_ids.map((genre_id, index) => ({
      user_id: userId,
      genre_id: genre_id,
      preference_strength: index < 3 ? 5 : 3 // Top 3 get higher strength
    }));

    const { data: insertedGenres, error: insertError } = await supabase
      .from('user_genres')
      .insert(genrePreferences)
      .select();

    if (insertError) {
      console.error('Error inserting genres:', insertError);
      return NextResponse.json(
        { error: 'Failed to save genres', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Updated ${insertedGenres?.length || 0} genre preferences for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Genre preferences updated successfully',
      genres: insertedGenres,
      count: insertedGenres?.length || 0,
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
