import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/albums/:albumId/tracks
 * Add track to album
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { albumId } = params;
    const body = await request.json();
    const { track_id, track_number } = body;

    if (!track_id) {
      return NextResponse.json(
        { error: 'track_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify album ownership
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('creator_id, tracks_count')
      .eq('id', albumId)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (album.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only add tracks to your own albums' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify track ownership
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('creator_id')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (track.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only add your own tracks to albums' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check tier limits for Premium users
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';

    if (tier === 'premium') {
      // Premium tier limited to 7 tracks per album
      if (album.tracks_count >= 7) {
        return NextResponse.json(
          { error: 'Premium users can have maximum 7 tracks per album. Upgrade to Unlimited for more.' },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Determine track number if not provided
    let finalTrackNumber = track_number;
    if (!finalTrackNumber) {
      // Get the next available track number
      const { data: existingTracks } = await supabase
        .from('album_tracks')
        .select('track_number')
        .eq('album_id', albumId)
        .order('track_number', { ascending: false })
        .limit(1);

      finalTrackNumber = existingTracks && existingTracks.length > 0
        ? existingTracks[0].track_number + 1
        : 1;
    }

    // Add track to album
    const { data: albumTrack, error: insertError } = await supabase
      .from('album_tracks')
      .insert({
        album_id: albumId,
        track_id: track_id,
        track_number: finalTrackNumber,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding track to album:', insertError);

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Track is already in this album or track number is taken' },
          { status: 409, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add track to album', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: albumTrack },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in POST /api/albums/:albumId/tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
