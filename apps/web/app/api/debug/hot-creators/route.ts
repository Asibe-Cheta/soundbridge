import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    // Test the exact query from hot creators API
    const { data: creators, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        location,
        country,
        genre,
        created_at,
        followers:follows!follows_following_id_fkey(count),
        recent_tracks:audio_tracks!audio_tracks_creator_id_fkey(
          id,
          title,
          play_count,
          like_count,
          created_at,
          genre
        ),
        all_tracks:audio_tracks!audio_tracks_creator_id_fkey(count),
        events:events!events_creator_id_fkey(count)
      `)
      .eq('role', 'creator')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: error,
        environment: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      creators: creators || [],
      count: creators?.length || 0,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV 
    }, { status: 500 });
  }
}
