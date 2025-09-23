import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get recent shares with content and user information
    const { data: shares, error: sharesError } = await supabase
      .from('shares')
      .select(`
        *,
        user:profiles!shares_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sharesError) {
      console.error('Error fetching shares:', sharesError);
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    // Get content details for each share
    const sharesWithContent = await Promise.all(
      shares.map(async (share) => {
        let content = null;
        
        if (share.content_type === 'track') {
          const { data: track } = await supabase
            .from('audio_tracks')
            .select(`
              id,
              title,
              creator_id,
              cover_art_url,
              duration,
              play_count,
              like_count,
              creator:profiles!audio_tracks_creator_id_fkey(
                username,
                display_name
              )
            `)
            .eq('id', share.content_id)
            .single();
          content = track;
        } else if (share.content_type === 'event') {
          const { data: event } = await supabase
            .from('events')
            .select(`
              id,
              title,
              creator_id,
              venue,
              event_date,
              start_time,
              creator:profiles!events_creator_id_fkey(
                username,
                display_name
              )
            `)
            .eq('id', share.content_id)
            .single();
          content = event;
        }

        return {
          ...share,
          content
        };
      })
    );

    // Filter out shares where content doesn't exist
    const validShares = sharesWithContent.filter(share => share.content !== null);

    return NextResponse.json({
      success: true,
      shares: validShares,
      count: validShares.length,
      hasMore: validShares.length === limit
    });

  } catch (error) {
    console.error('Discover shares API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
