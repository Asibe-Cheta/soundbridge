import { NextRequest, NextResponse } from 'next/server';
import { createApiClientWithCookies } from '@/src/lib/supabase-api';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClientWithCookies();

    // Get all creators without any filters
    const { data: creators, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        bio,
        role,
        location,
        country,
        created_at,
        updated_at,
        followers:follows!follows_following_id_fkey(count),
        tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
        events:events!events_creator_id_fkey(count)
      `)
      .eq('role', 'creator')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all creators:', error);
      return NextResponse.json({
        error: 'Failed to fetch creators',
        details: error.message
      }, { status: 500 });
    }

    // Format the data
    const formattedCreators = creators?.map(creator => ({
      id: creator.id,
      username: creator.username,
      display_name: creator.display_name,
      bio: creator.bio,
      role: creator.role,
      location: creator.location,
      country: creator.country,
      created_at: creator.created_at,
      updated_at: creator.updated_at,
      followers_count: creator.followers?.[0]?.count || 0,
      tracks_count: creator.tracks?.[0]?.count || 0,
      events_count: creator.events?.[0]?.count || 0
    })) || [];

    return NextResponse.json({
      total_creators: formattedCreators.length,
      creators: formattedCreators,
      debug_info: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not Set'
      }
    });

  } catch (error) {
    console.error('Unexpected error in debug creators:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
