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
 * POST /api/likes/toggle
 * Toggle like on any content (track, album, playlist, event)
 * Body: { content_id: string, content_type: 'track' | 'album' | 'playlist' | 'event' }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { content_id, content_type } = body;

    if (!content_id || !content_type) {
      return NextResponse.json(
        { error: 'content_id and content_type are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate content_type
    const validContentTypes = ['track', 'album', 'playlist', 'event'];
    if (!validContentTypes.includes(content_type)) {
      return NextResponse.json(
        { error: 'Invalid content_type. Must be: track, album, playlist, or event' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if like already exists
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .single();

    let isLiked = false;
    let message = '';

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return NextResponse.json(
          { error: 'Failed to unlike', details: deleteError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      isLiked = false;
      message = 'Content unliked successfully';

      // Decrement like count based on content type
      await decrementLikeCount(supabase, content_id, content_type);
    } else {
      // Like - add the like
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          content_id,
          content_type,
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return NextResponse.json(
          { error: 'Failed to like', details: insertError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      isLiked = true;
      message = 'Content liked successfully';

      // Increment like count based on content type
      await incrementLikeCount(supabase, content_id, content_type);
    }

    return NextResponse.json(
      { isLiked, message },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in POST /api/likes/toggle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to increment like count
 */
async function incrementLikeCount(
  supabase: any,
  content_id: string,
  content_type: string
) {
  try {
    if (content_type === 'track') {
      await supabase.rpc('increment_track_likes', { track_id: content_id });
    } else if (content_type === 'album') {
      await supabase
        .from('albums')
        .update({ total_likes: supabase.raw('total_likes + 1') })
        .eq('id', content_id);
    }
    // Playlists and events don't have like_count columns in current schema
  } catch (error) {
    console.error('Error incrementing like count:', error);
  }
}

/**
 * Helper function to decrement like count
 */
async function decrementLikeCount(
  supabase: any,
  content_id: string,
  content_type: string
) {
  try {
    if (content_type === 'track') {
      await supabase.rpc('decrement_track_likes', { track_id: content_id });
    } else if (content_type === 'album') {
      await supabase
        .from('albums')
        .update({ total_likes: supabase.raw('GREATEST(total_likes - 1, 0)') })
        .eq('id', content_id);
    }
    // Playlists and events don't have like_count columns in current schema
  } catch (error) {
    console.error('Error decrementing like count:', error);
  }
}
