import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
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

    const { content_id, content_type, share_type, caption, external_platform, external_url } = await request.json();

    // Validate required fields
    if (!content_id || !content_type) {
      return NextResponse.json(
        { error: 'Content ID and content type are required' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!['track', 'event'].includes(content_type)) {
      return NextResponse.json(
        { error: 'Invalid content type. Must be "track" or "event"' },
        { status: 400 }
      );
    }

    // Validate share type
    if (!['repost', 'external_share'].includes(share_type)) {
      return NextResponse.json(
        { error: 'Invalid share type. Must be "repost" or "external_share"' },
        { status: 400 }
      );
    }

    // Check if user has already shared this content
    const { data: existingShare } = await supabase
      .from('shares')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .single();

    if (existingShare) {
      return NextResponse.json(
        { error: 'You have already shared this content' },
        { status: 409 }
      );
    }

    // Create the share
    const { data: share, error: shareError } = await supabase
      .from('shares')
      .insert({
        user_id: user.id,
        content_id,
        content_type,
        share_type,
        caption: caption || null,
        external_platform: external_platform || null,
        external_url: external_url || null,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating share:', shareError);
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      );
    }

    // Create notification for content creator (if it's a repost)
    if (share_type === 'repost') {
      try {
        // Get the content creator's ID
        let creatorId: string | null = null;
        
        if (content_type === 'track') {
          const { data: track } = await supabase
            .from('audio_tracks')
            .select('creator_id')
            .eq('id', content_id)
            .single();
          creatorId = track?.creator_id || null;
        } else if (content_type === 'event') {
          const { data: event } = await supabase
            .from('events')
            .select('creator_id')
            .eq('id', content_id)
            .single();
          creatorId = event?.creator_id || null;
        }

        // Create notification if creator is different from sharer
        if (creatorId && creatorId !== user.id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: creatorId,
              type: 'share',
              title: 'Your content was shared',
              message: `${user.email} shared your ${content_type}`,
              related_content_id: content_id,
              related_content_type: content_type,
              is_read: false,
            });
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the share if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      share,
      message: 'Content shared successfully'
    });

  } catch (error) {
    console.error('Share API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const content_id = searchParams.get('content_id');
    const content_type = searchParams.get('content_type');

    if (!content_id || !content_type) {
      return NextResponse.json(
        { error: 'Content ID and content type are required' },
        { status: 400 }
      );
    }

    // Get shares for the content
    const { data: shares, error: sharesError } = await supabase
      .from('shares')
      .select(`
        *,
        user:profiles!shares_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .order('created_at', { ascending: false });

    if (sharesError) {
      console.error('Error fetching shares:', sharesError);
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shares,
      count: shares.length
    });

  } catch (error) {
    console.error('Get shares API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
