import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { eventNotificationService } from '@/src/services/EventNotificationService';

/**
 * POST /api/tracks/[id]/queue-notifications
 * Queue push notifications for users matching track genre/preferences.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id')
      .eq('id', id)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    if (track.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the track creator can queue notifications' },
        { status: 403 }
      );
    }

    const result = await eventNotificationService.queueNotificationsForTrack(id);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to queue track notifications',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      queued_count: result.queued_count,
      message: `Successfully queued ${result.queued_count} track notifications`,
      track: {
        id: track.id,
        title: track.title,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/tracks/[id]/queue-notifications:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
