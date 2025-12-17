// Track Appeal API
// POST /api/tracks/[trackId]/appeal
// Allow users to appeal rejected content

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { trackId } = params;
    const { appealText } = await request.json();

    // Validate appeal text
    if (!appealText || appealText.trim().length < 20) {
      return NextResponse.json(
        { error: 'Appeal must be at least 20 characters' },
        { status: 400 }
      );
    }

    if (appealText.length > 500) {
      return NextResponse.json(
        { error: 'Appeal must be less than 500 characters' },
        { status: 400 }
      );
    }

    // Get track and verify ownership
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Verify user owns this track
    if (track.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only appeal your own tracks' },
        { status: 403 }
      );
    }

    // Verify track is rejected
    if (track.moderation_status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only rejected tracks can be appealed' },
        { status: 400 }
      );
    }

    // Check if already appealed
    if (track.appeal_text) {
      return NextResponse.json(
        { error: 'This track has already been appealed. Please wait for admin review.' },
        { status: 400 }
      );
    }

    // Update track with appeal
    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update({
        appeal_text: appealText.trim(),
        appeal_status: 'pending',
        moderation_status: 'appealed',
        updated_at: new Date().toISOString()
      })
      .eq('id', trackId);

    if (updateError) {
      console.error('Error updating track with appeal:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit appeal' },
        { status: 500 }
      );
    }

    // Create in-app notification for admins
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id, // Will be visible to admins
        type: 'moderation',
        title: 'Appeal Submitted',
        message: `New appeal for "${track.title}"`,
        link: `/admin/moderation`,
        read: false,
        created_at: new Date().toISOString()
      });

    if (notificationError) {
      console.error('Error creating admin notification:', notificationError);
    }

    // Send confirmation notification to user
    const { error: userNotificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'moderation',
        title: 'Appeal Received',
        message: `Your appeal for "${track.title}" has been submitted. We'll review it within 24-48 hours.`,
        link: `/track/${trackId}`,
        read: false,
        created_at: new Date().toISOString()
      });

    if (userNotificationError) {
      console.error('Error creating user notification:', userNotificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Appeal submitted successfully. We will review it within 24-48 hours.'
    });

  } catch (error) {
    console.error('Appeal submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error while submitting appeal' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
