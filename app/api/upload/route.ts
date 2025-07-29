import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '../../../src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient();

    // Get the current user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract user from token (simplified - in production, verify the token properly)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      genre,
      tags,
      privacy,
      publishOption,
      scheduleDate,
      audioFileUrl,
      coverArtUrl,
      duration
    } = body;

    // Validate required fields
    if (!title || !audioFileUrl) {
      return NextResponse.json(
        { error: 'Title and audio file are required' },
        { status: 400 }
      );
    }

    // Validate privacy setting
    if (!['public', 'followers', 'private'].includes(privacy)) {
      return NextResponse.json(
        { error: 'Invalid privacy setting' },
        { status: 400 }
      );
    }

    // Validate publish option
    if (!['now', 'schedule', 'draft'].includes(publishOption)) {
      return NextResponse.json(
        { error: 'Invalid publish option' },
        { status: 400 }
      );
    }

    // Validate schedule date if scheduling
    if (publishOption === 'schedule' && !scheduleDate) {
      return NextResponse.json(
        { error: 'Schedule date is required when scheduling' },
        { status: 400 }
      );
    }

    // Create audio track record
    const trackData = {
      title: title.trim(),
      description: description?.trim() || null,
      creator_id: user.id,
      file_url: audioFileUrl,
      cover_art_url: coverArtUrl || null,
      duration: duration || 0,
      genre: genre || null,
      tags: tags || null,
      is_public: privacy === 'public',
      created_at: new Date().toISOString()
    };

    const { data: track, error: insertError } = await supabase
      .from('audio_tracks')
      .insert([trackData])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create track record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      track: {
        id: track.id,
        title: track.title,
        file_url: track.file_url,
        cover_art_url: track.cover_art_url,
        duration: track.duration,
        created_at: track.created_at
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();

    // Get the current user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get user's tracks
    const { data: tracks, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tracks: tracks || []
    });

  } catch (error) {
    console.error('Get tracks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 