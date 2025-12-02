// API endpoint for audio quality processing
// Handles audio transcoding and quality processing requests

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { AudioQualitySettings } from '@/src/lib/types/audio-quality';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trackId, targetQuality } = body;

    if (!trackId || !targetQuality) {
      return NextResponse.json(
        { error: 'Missing required fields: trackId and targetQuality' },
        { status: 400 }
      );
    }

    // Validate target quality
    const validQualities = ['standard', 'hd', 'lossless'];
    if (!validQualities.includes(targetQuality.level)) {
      return NextResponse.json(
        { error: 'Invalid target quality level' },
        { status: 400 }
      );
    }

    // Get user's current tier
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const userTier = subscription?.tier || 'free';

    // Validate quality against user tier
    const tierLimits = {
      free: ['standard'],
      pro: ['standard', 'hd'],
      enterprise: ['standard', 'hd', 'lossless']
    };

    if (!tierLimits[userTier as keyof typeof tierLimits].includes(targetQuality.level)) {
      return NextResponse.json(
        { error: `${targetQuality.level} quality is not available for ${userTier} tier` },
        { status: 403 }
      );
    }

    // Get the track to process
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('id', trackId)
      .eq('creator_id', user.id)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found or access denied' },
        { status: 404 }
      );
    }

    // Check if track is already at target quality
    if (track.audio_quality === targetQuality.level) {
      return NextResponse.json({
        success: true,
        message: 'Track is already at the target quality',
        trackId: track.id,
        currentQuality: track.audio_quality
      });
    }

    // Add to processing queue
    const { data: queueItem, error: queueError } = await supabase
      .from('audio_processing_queue')
      .insert({
        track_id: trackId,
        user_id: user.id,
        target_quality: targetQuality.level,
        target_bitrate: targetQuality.bitrate,
        target_sample_rate: targetQuality.sampleRate,
        target_channels: targetQuality.channels,
        target_codec: targetQuality.codec,
        original_file_path: track.file_url,
        priority: userTier === 'pro' ? 2 : 1
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error adding to processing queue:', queueError);
      return NextResponse.json(
        { error: 'Failed to queue audio processing' },
        { status: 500 }
      );
    }

    // Update track processing status
    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update({
        processing_status: 'pending',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', trackId);

    if (updateError) {
      console.error('Error updating track processing status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Audio processing queued successfully',
      queueId: queueItem.id,
      trackId: trackId,
      targetQuality: targetQuality.level,
      estimatedProcessingTime: userTier === 'pro' ? '1 minute' : '2 minutes'
    });

  } catch (error) {
    console.error('Error in audio quality processing API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get processing status for a track
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');

    if (!trackId) {
      return NextResponse.json(
        { error: 'Missing trackId parameter' },
        { status: 400 }
      );
    }

    // Get track processing status
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, processing_status, audio_quality, bitrate, processing_started_at, processing_completed_at')
      .eq('id', trackId)
      .eq('creator_id', user.id)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found or access denied' },
        { status: 404 }
      );
    }

    // Get queue status if processing
    let queueStatus = null;
    if (track.processing_status === 'pending' || track.processing_status === 'processing') {
      const { data: queueItem, error: queueError } = await supabase
        .from('audio_processing_queue')
        .select('*')
        .eq('track_id', trackId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!queueError && queueItem) {
        queueStatus = {
          id: queueItem.id,
          status: queueItem.status,
          targetQuality: queueItem.target_quality,
          targetBitrate: queueItem.target_bitrate,
          createdAt: queueItem.created_at,
          processingStartedAt: queueItem.processing_started_at,
          errorMessage: queueItem.error_message,
          retryCount: queueItem.retry_count
        };
      }
    }

    return NextResponse.json({
      trackId: track.id,
      processingStatus: track.processing_status,
      currentQuality: track.audio_quality,
      currentBitrate: track.bitrate,
      processingStartedAt: track.processing_started_at,
      processingCompletedAt: track.processing_completed_at,
      queueStatus
    });

  } catch (error) {
    console.error('Error getting processing status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
