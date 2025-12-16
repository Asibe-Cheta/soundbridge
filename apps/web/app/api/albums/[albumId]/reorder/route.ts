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
 * PUT /api/albums/:albumId/reorder
 * Reorder tracks in album
 * Body: { tracks: [{ track_id: string, track_number: number }] }
 */
export async function PUT(
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
    const { tracks } = body;

    if (!tracks || !Array.isArray(tracks)) {
      return NextResponse.json(
        { error: 'tracks array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify album ownership
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('creator_id')
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
        { error: 'Unauthorized - You can only reorder tracks in your own albums' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Update track numbers for each track
    const updatePromises = tracks.map(({ track_id, track_number }) => {
      return supabase
        .from('album_tracks')
        .update({ track_number })
        .eq('album_id', albumId)
        .eq('track_id', track_id);
    });

    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error reordering tracks:', errors);
      return NextResponse.json(
        { error: 'Failed to reorder some tracks', details: errors[0].error?.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch updated album tracks
    const { data: updatedTracks, error: fetchError } = await supabase
      .from('album_tracks')
      .select(`
        id,
        track_number,
        track:audio_tracks(
          id,
          title,
          duration
        )
      `)
      .eq('album_id', albumId)
      .order('track_number', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated tracks:', fetchError);
      return NextResponse.json(
        { error: 'Tracks reordered but failed to fetch updated list', details: fetchError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: updatedTracks, message: 'Tracks reordered successfully' },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in PUT /api/albums/:albumId/reorder:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
