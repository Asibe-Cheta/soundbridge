import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getCreatorTracks } from '@/src/lib/creator';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    if (creatorId) {
      const { data, error } = await getCreatorTracks(creatorId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch audio content' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        tracks: data || []
      });
    }

    // If no creatorId, return all public tracks
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select(`
        *,
        creator:profiles!audio_tracks_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch audio content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tracks: tracks || []
    });

  } catch (error) {
    console.error('Audio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    // Validate required fields
    const { title, genre, duration, file_url, creator_id } = body;
    
    if (!title || !genre || !duration || !file_url || !creator_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new audio content
    const { data, error } = await supabase
      .from('audio_content')
      .insert({
        title,
        genre,
        duration,
        file_url,
        creator_id,
        description: body.description || null,
        artwork_url: body.artwork_url || null,
        is_public: body.is_public !== false, // Default to true
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create audio content' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 