import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Value Demo API called');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('user_type');
    const genresParam = searchParams.get('genres');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 3;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 10) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 10' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Supabase client (authentication optional but recommended)
    const { supabase, user } = await getSupabaseRouteClient(request, false);

    // Parse genres if provided
    const genres = genresParam ? genresParam.split(',').map(g => g.trim()).filter(Boolean) : [];

    // Build query to get successful creator profiles
    let query = supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        location,
        country,
        bio,
        role,
        followers_count,
        total_plays,
        verified,
        genres
      `)
      .eq('role', 'creator')
      .is('deleted_at', null)
      .order('followers_count', { ascending: false })
      .limit(limit * 2); // Get more than needed to filter

    // Filter by user type if provided (map to role or other criteria)
    // Note: user_type is more of a categorization, we'll use role='creator' and filter by engagement
    if (userType) {
      // For now, we'll prioritize creators with high engagement regardless of type
      // In the future, we could add a user_type field to profiles
    }

    // Filter by genres if provided
    if (genres.length > 0) {
      query = query.contains('genres', genres);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('❌ Error fetching creator profiles:', profilesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch creator profiles' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform profiles to match expected format
    const creators = (profiles || []).slice(0, limit).map((profile: any) => ({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      location: profile.location || null,
      country: profile.country || null,
      bio: profile.bio || null,
      role: profile.role,
      stats: {
        connections: profile.followers_count || 0,
        tracks: 0, // Would need to count from audio_tracks table
        verified: profile.verified || false
      }
    }));

    // If we don't have enough creators, try to get more without genre filter
    if (creators.length < limit && genres.length > 0) {
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          location,
          country,
          bio,
          role,
          followers_count,
          total_plays,
          verified,
          genres
        `)
        .eq('role', 'creator')
        .is('deleted_at', null)
        .order('followers_count', { ascending: false })
        .limit(limit - creators.length);

      if (fallbackProfiles) {
        const fallbackCreators = fallbackProfiles.map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          location: profile.location || null,
          country: profile.country || null,
          bio: profile.bio || null,
          role: profile.role,
          stats: {
            connections: profile.followers_count || 0,
            tracks: 0,
            verified: profile.verified || false
          }
        }));

        creators.push(...fallbackCreators);
      }
    }

    console.log('✅ Value demo creators fetched:', creators.length);

    return NextResponse.json({
      success: true,
      creators: creators.slice(0, limit)
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error fetching value demo:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
