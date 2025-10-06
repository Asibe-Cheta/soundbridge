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
    const genreIds = searchParams.get('genre_ids')?.split(',') || [];
    const location = searchParams.get('location'); // City
    const country = searchParams.get('country'); // Country
    const contentType = searchParams.get('type') || 'track'; // 'track' or 'podcast'
    const limit = parseInt(searchParams.get('limit') || '20');

    if (genreIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one genre_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Build query for content by genres with location-based prioritization
    let query = supabase
      .from('content_genres')
      .select(`
        content_id,
        content_type,
        created_at,
        genre:genres!content_genres_genre_id_fkey(
          id,
          name,
          category
        )
      `)
      .eq('content_type', contentType)
      .in('genre_id', genreIds);

    const { data: contentGenres, error: contentError } = await query;

    if (contentError) {
      console.error('Error fetching content by genres:', contentError);
      return NextResponse.json(
        { error: 'Failed to fetch content', details: contentError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get unique content IDs
    const contentIds = [...new Set(contentGenres?.map(cg => cg.content_id) || [])];

    if (contentIds.length === 0) {
      return NextResponse.json({
        success: true,
        content: [],
        count: 0,
        message: 'No content found for selected genres',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders });
    }

    // Fetch actual content (tracks or podcasts) with creator info
    const tableName = contentType === 'track' ? 'audio_tracks' : 'podcasts';
    
    let contentQuery = supabase
      .from(tableName)
      .select(`
        id,
        title,
        description,
        ${contentType === 'track' ? 'file_url, cover_art_url, duration, play_count, likes_count' : 'episode_url, thumbnail_url, duration'},
        created_at,
        creator:profiles!${tableName}_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          location,
          country
        )
      `)
      .in('id', contentIds)
      .eq('is_public', true);

    const { data: content, error: fetchError } = await contentQuery;

    if (fetchError) {
      console.error('Error fetching content details:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch content details', details: fetchError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Sort content by location proximity
    let sortedContent = content || [];
    
    if (location || country) {
      sortedContent = sortedContent.sort((a, b) => {
        const aScore = 
          (location && a.creator.location === location ? 100 : 0) +
          (country && a.creator.country === country ? 50 : 0) +
          (a.play_count || 0) / 100;
        
        const bScore = 
          (location && b.creator.location === location ? 100 : 0) +
          (country && b.creator.country === country ? 50 : 0) +
          (b.play_count || 0) / 100;
        
        return bScore - aScore;
      });
    } else {
      // Sort by play count if no location
      sortedContent = sortedContent.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    }

    // Apply limit
    sortedContent = sortedContent.slice(0, limit);

    console.log(`✅ Found ${sortedContent.length} ${contentType}s for ${genreIds.length} genres`);

    return NextResponse.json({
      success: true,
      content: sortedContent,
      count: sortedContent.length,
      type: contentType,
      genres: genreIds.length,
      location_filtered: !!(location || country),
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error fetching content by genres:', error);
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
