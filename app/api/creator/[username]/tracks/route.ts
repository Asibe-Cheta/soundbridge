import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const { username } = resolvedParams;

    const supabase = createServiceClient();

    // First, get the creator's profile
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get all tracks for this creator - simplified query first
    const { data, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    console.log('Raw tracks data:', data);
    console.log('Query error:', error);

    if (error) {
      console.error('Error fetching tracks:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    // Transform the data to match AudioTrack interface - simplified
    const transformedData = (data || []).map(track => ({
      id: track.id,
      title: track.title || 'Untitled',
      description: track.description || '',
      creator_id: track.creator_id,
      file_url: track.file_url || '',
      cover_art_url: track.cover_art_url || null,
      duration: track.duration || 0,
      genre: track.genre || 'Unknown',
      tags: track.tags || [],
      play_count: track.play_count || 0,
      like_count: track.like_count || 0,
      is_public: track.is_public !== false,
      created_at: track.created_at || new Date().toISOString(),
      creator: {
        id: creator.id,
        username: username,
        display_name: username, // Fallback
        avatar_url: null,
        banner_url: null,
        location: null,
        country: null,
        bio: null,
        role: 'creator' as const,
        is_verified: false,
        social_links: {},
        created_at: '',
        updated_at: ''
      }
    }));

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error in tracks API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
