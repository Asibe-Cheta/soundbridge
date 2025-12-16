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
 * GET /api/albums/:albumId
 * Get album details with tracks
 */
export async function GET(
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

    const { albumId } = params;

    // Get album with creator info and tracks
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select(`
        *,
        creator:profiles!albums_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        album_tracks(
          id,
          track_number,
          added_at,
          track:audio_tracks(
            id,
            title,
            cover_image_url,
            audio_url,
            duration,
            genre,
            play_count,
            like_count,
            is_public,
            created_at
          )
        )
      `)
      .eq('id', albumId)
      .single();

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Sort tracks by track_number
    if (album.album_tracks) {
      album.album_tracks.sort((a, b) => a.track_number - b.track_number);
    }

    return NextResponse.json(
      { data: album },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/albums/:albumId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/albums/:albumId
 * Update album details
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
    const { title, description, cover_image_url, release_date, status, genre, is_public } = body;

    // Verify album ownership
    const { data: album, error: fetchError } = await supabase
      .from('albums')
      .select('creator_id, status')
      .eq('id', albumId)
      .single();

    if (fetchError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (album.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only update your own albums' },
        { status: 403, headers: corsHeaders }
      );
    }

    // If changing status to 'published', validate tier limits
    if (status === 'published' && album.status !== 'published') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      const tier = profile?.subscription_tier || 'free';

      if (tier === 'free') {
        return NextResponse.json(
          { error: 'Albums feature is not available on Free tier. Upgrade to Premium or Unlimited.' },
          { status: 403, headers: corsHeaders }
        );
      }

      if (tier === 'premium') {
        // Check if user already has 2 published albums (excluding current one)
        const { count } = await supabase
          .from('albums')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .eq('status', 'published')
          .neq('id', albumId);

        if (count && count >= 2) {
          return NextResponse.json(
            { error: 'Premium users can have maximum 2 published albums. Upgrade to Unlimited for more.' },
            { status: 403, headers: corsHeaders }
          );
        }
      }
    }

    // Update album
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;
    if (release_date !== undefined) updateData.release_date = release_date;
    if (status !== undefined) updateData.status = status;
    if (genre !== undefined) updateData.genre = genre;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data: updatedAlbum, error: updateError } = await supabase
      .from('albums')
      .update(updateData)
      .eq('id', albumId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating album:', updateError);
      return NextResponse.json(
        { error: 'Failed to update album', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: updatedAlbum },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in PUT /api/albums/:albumId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/albums/:albumId
 * Delete album (cascade deletes album_tracks)
 */
export async function DELETE(
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

    // Verify album ownership
    const { data: album, error: fetchError } = await supabase
      .from('albums')
      .select('creator_id')
      .eq('id', albumId)
      .single();

    if (fetchError || !album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (album.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete your own albums' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Delete album (album_tracks will cascade delete)
    const { error: deleteError } = await supabase
      .from('albums')
      .delete()
      .eq('id', albumId);

    if (deleteError) {
      console.error('Error deleting album:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete album', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: 'Album deleted successfully' },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in DELETE /api/albums/:albumId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
