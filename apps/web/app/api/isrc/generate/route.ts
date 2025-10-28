import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🎵 ISRC Generation API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackId, trackTitle, artistName } = body;

    // Validate required fields
    if (!trackId || !trackTitle || !artistName) {
      return NextResponse.json(
        { error: 'Track ID, title, and artist name are required' },
        { status: 400 }
      );
    }

    // Check if track exists and belongs to user
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id')
      .eq('id', trackId)
      .eq('creator_id', user.id)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found or access denied' },
        { status: 404 }
      );
    }

    // Check if ISRC already exists for this track
    const { data: existingIsrc, error: isrcError } = await supabase
      .from('isrc_registry')
      .select('isrc, status')
      .eq('track_id', trackId)
      .eq('status', 'active')
      .single();

    if (existingIsrc && !isrcError) {
      return NextResponse.json({
        success: true,
        isrc: existingIsrc.isrc,
        status: 'existing',
        trackInfo: {
          title: trackTitle,
          artist: artistName,
          isrc: existingIsrc.isrc
        }
      });
    }

    // Generate new ISRC
    const { data: isrcResult, error: generateError } = await supabase
      .rpc('generate_isrc', {
        user_id: user.id,
        track_title: trackTitle
      });

    if (generateError) {
      console.error('❌ Error generating ISRC:', generateError);
      return NextResponse.json(
        { error: 'Failed to generate ISRC' },
        { status: 500 }
      );
    }

    const generatedIsrc = isrcResult;

    // Update the track with the ISRC
    const { error: updateError } = await supabase
      .from('isrc_registry')
      .update({ track_id: trackId })
      .eq('isrc', generatedIsrc);

    if (updateError) {
      console.error('❌ Error updating ISRC with track ID:', updateError);
      // Don't fail the request, ISRC was generated successfully
    }

    console.log('✅ ISRC generated successfully:', generatedIsrc);

    return NextResponse.json({
      success: true,
      isrc: generatedIsrc,
      status: 'generated',
      trackInfo: {
        title: trackTitle,
        artist: artistName,
        isrc: generatedIsrc
      }
    });

  } catch (error) {
    console.error('❌ Error in ISRC generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user's ISRCs
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('isrc_registry')
      .select(`
        isrc,
        track_id,
        status,
        generated_at,
        created_at,
        audio_tracks!inner(title, artist_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (trackId) {
      query = query.eq('track_id', trackId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: isrcs, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching ISRCs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch ISRCs' },
        { status: 500 }
      );
    }

    // Format response
    const formattedIsrcs = isrcs?.map(item => ({
      trackId: item.track_id,
      isrc: item.isrc,
      status: item.status,
      trackTitle: item.audio_tracks?.title || 'Unknown Track',
      artistName: item.audio_tracks?.artist_name || 'Unknown Artist',
      createdAt: item.created_at,
      generatedAt: item.generated_at
    })) || [];

    return NextResponse.json({
      success: true,
      isrcs: formattedIsrcs
    });

  } catch (error) {
    console.error('❌ Error in ISRC fetch API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
