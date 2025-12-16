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
 * GET /api/users/:userId/likes?content_type=track
 * Get user's liked content (optionally filtered by content_type)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const content_type = searchParams.get('content_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Filter by content_type if provided
    if (content_type) {
      query = query.eq('content_type', content_type);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: likes, error, count } = await query;

    if (error) {
      console.error('Error fetching user likes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch likes', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch the actual content for each like
    const enrichedLikes = await Promise.all(
      (likes || []).map(async (like) => {
        let content = null;

        try {
          if (like.content_type === 'track') {
            const { data } = await supabase
              .from('audio_tracks')
              .select(`
                id,
                title,
                cover_image_url,
                audio_url,
                duration,
                genre,
                play_count,
                like_count,
                creator:profiles!audio_tracks_creator_id_fkey(
                  id,
                  username,
                  display_name,
                  avatar_url
                )
              `)
              .eq('id', like.content_id)
              .single();
            content = data;
          } else if (like.content_type === 'album') {
            const { data } = await supabase
              .from('albums')
              .select(`
                id,
                title,
                description,
                cover_image_url,
                tracks_count,
                total_duration,
                total_plays,
                total_likes,
                creator:profiles!albums_creator_id_fkey(
                  id,
                  username,
                  display_name,
                  avatar_url
                )
              `)
              .eq('id', like.content_id)
              .single();
            content = data;
          } else if (like.content_type === 'playlist') {
            const { data } = await supabase
              .from('playlists')
              .select(`
                id,
                name,
                description,
                cover_image_url,
                tracks_count,
                total_duration,
                creator:profiles!playlists_creator_id_fkey(
                  id,
                  username,
                  display_name,
                  avatar_url
                )
              `)
              .eq('id', like.content_id)
              .single();
            content = data;
          } else if (like.content_type === 'event') {
            const { data } = await supabase
              .from('events')
              .select(`
                id,
                title,
                description,
                event_image_url,
                start_time,
                end_time,
                location,
                creator:profiles!events_creator_id_fkey(
                  id,
                  username,
                  display_name,
                  avatar_url
                )
              `)
              .eq('id', like.content_id)
              .single();
            content = data;
          }
        } catch (fetchError) {
          console.error(`Error fetching ${like.content_type}:`, fetchError);
        }

        return {
          ...like,
          content,
        };
      })
    );

    return NextResponse.json(
      { data: enrichedLikes, count: count || 0 },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/users/:userId/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
