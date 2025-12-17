// Moderation Orchestrator for SoundBridge
// Combines Whisper transcription + OpenAI moderation + Spam detection

import { transcribeAudioFromUrl } from './whisper-service';
import { moderateContent, type ModerationResult } from './content-moderation-service';
import type { WhisperModel } from './whisper-service';

/**
 * Track moderation options
 */
export interface TrackModerationOptions {
  whisperModel?: WhisperModel;
  sampleOnly?: boolean; // Transcribe only first 2 minutes
  maxDuration?: number; // Max duration to transcribe (seconds)
  strictness?: 'low' | 'medium' | 'high';
}

/**
 * Complete moderation result with transcription
 */
export interface CompleteModerationResult {
  transcription: string;
  transcriptionTime: number;
  moderationResult: ModerationResult;
  totalProcessingTime: number;
  success: boolean;
  error?: string;
}

/**
 * Moderate audio track
 * Complete pipeline: Download → Transcribe (Whisper) → Moderate (OpenAI + Spam)
 *
 * @param audioUrl - URL to audio file
 * @param metadata - Track metadata
 * @param options - Moderation options
 * @returns Complete moderation result
 */
export async function moderateAudioTrack(
  audioUrl: string,
  metadata: {
    title: string;
    description?: string;
    artistName: string;
    trackId: string;
  },
  options: TrackModerationOptions = {}
): Promise<CompleteModerationResult> {
  const startTime = Date.now();

  const {
    whisperModel = 'base',
    sampleOnly = false,
    maxDuration = 120,
    strictness = 'medium'
  } = options;

  try {
    console.log(`🎵 Starting moderation for track: ${metadata.title} by ${metadata.artistName}`);

    // Step 1: Transcribe audio with Whisper
    console.log('Step 1: Transcribing audio...');
    const transcriptionResult = await transcribeAudioFromUrl(audioUrl, {
      model: whisperModel,
      sampleOnly,
      maxDuration
    });

    console.log(`✅ Transcription complete in ${transcriptionResult.processingTime.toFixed(1)}s`);
    console.log(`📝 Transcribed ${transcriptionResult.text.length} characters`);

    // Step 2: Moderate transcription
    console.log('Step 2: Moderating content...');
    const moderationResult = await moderateContent(
      transcriptionResult.text,
      {
        title: metadata.title,
        description: metadata.description,
        artistName: metadata.artistName
      },
      strictness
    );

    const totalProcessingTime = (Date.now() - startTime) / 1000;

    console.log(`✅ Moderation complete in ${totalProcessingTime.toFixed(1)}s`);
    console.log(`📊 Result: ${moderationResult.moderationStatus} (confidence: ${(moderationResult.confidence * 100).toFixed(1)}%)`);

    if (moderationResult.isFlagged) {
      console.warn(`⚠️ Content flagged for review:`, moderationResult.flagReasons);
    }

    return {
      transcription: transcriptionResult.text,
      transcriptionTime: transcriptionResult.processingTime,
      moderationResult,
      totalProcessingTime,
      success: true
    };

  } catch (error) {
    const totalProcessingTime = (Date.now() - startTime) / 1000;

    console.error('❌ Moderation failed:', error);

    return {
      transcription: '',
      transcriptionTime: 0,
      moderationResult: {
        isFlagged: false,
        confidence: 0,
        flagReasons: [],
        moderationStatus: 'clean',
        recommendedAction: 'approve'
      },
      totalProcessingTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update track moderation status in database
 *
 * @param supabase - Supabase client
 * @param trackId - Track ID
 * @param moderationResult - Moderation result
 * @param transcription - Transcription text
 */
export async function updateTrackModerationStatus(
  supabase: any,
  trackId: string,
  moderationResult: CompleteModerationResult
): Promise<void> {
  try {
    const { moderationResult: result, transcription } = moderationResult;

    // Prepare update data
    const updateData: any = {
      moderation_status: result.moderationStatus === 'flagged' ? 'flagged' : 'clean',
      moderation_checked_at: new Date().toISOString(),
      moderation_flagged: result.isFlagged,
      moderation_confidence: result.confidence,
      transcription,
      flag_reasons: result.isFlagged ? result.flagReasons : []
    };

    // Update track
    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update(updateData)
      .eq('id', trackId);

    if (updateError) {
      console.error('Error updating track moderation status:', updateError);
      throw new Error('Failed to update moderation status');
    }

    console.log(`✅ Updated moderation status for track ${trackId}`);

    // If flagged, add to admin review queue
    if (result.isFlagged) {
      const priority = result.confidence >= 0.9 ? 'urgent' :
                      result.confidence >= 0.7 ? 'high' : 'normal';

      const { error: queueError } = await supabase
        .rpc('add_to_moderation_queue', {
          p_track_id: trackId,
          p_flag_reasons: result.flagReasons,
          p_confidence: result.confidence
        });

      if (queueError) {
        console.error('Error adding to moderation queue:', queueError);
        // Don't throw - track is still updated
      } else {
        console.log(`✅ Added track ${trackId} to moderation review queue (priority: ${priority})`);
      }
    }

  } catch (error) {
    console.error('Error in updateTrackModerationStatus:', error);
    throw error;
  }
}

/**
 * Process pending moderation tracks in batch
 *
 * @param supabase - Supabase client
 * @param batchSize - Number of tracks to process
 * @param options - Moderation options
 * @returns Number of tracks processed
 */
export async function processPendingModerationBatch(
  supabase: any,
  batchSize: number = 10,
  options: TrackModerationOptions = {}
): Promise<{ processed: number; flagged: number; errors: number }> {
  try {
    console.log(`🔄 Processing batch of ${batchSize} pending moderation tracks...`);

    // Get pending tracks
    const { data: pendingTracks, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('id, title, artist_name, file_url, description')
      .eq('moderation_status', 'pending_check')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching pending tracks:', fetchError);
      throw new Error('Failed to fetch pending tracks');
    }

    if (!pendingTracks || pendingTracks.length === 0) {
      console.log('No pending tracks to process');
      return { processed: 0, flagged: 0, errors: 0 };
    }

    console.log(`Found ${pendingTracks.length} pending tracks`);

    let processed = 0;
    let flagged = 0;
    let errors = 0;

    // Process each track
    for (const track of pendingTracks) {
      try {
        console.log(`\nProcessing track ${processed + 1}/${pendingTracks.length}: ${track.title}`);

        // Update status to 'checking'
        await supabase
          .from('audio_tracks')
          .update({ moderation_status: 'checking' })
          .eq('id', track.id);

        // Moderate track
        const result = await moderateAudioTrack(
          track.file_url,
          {
            trackId: track.id,
            title: track.title,
            artistName: track.artist_name,
            description: track.description
          },
          options
        );

        if (result.success) {
          // Update database with result
          await updateTrackModerationStatus(supabase, track.id, result);

          processed++;
          if (result.moderationResult.isFlagged) {
            flagged++;
          }
        } else {
          console.error(`Failed to moderate track ${track.id}:`, result.error);
          errors++;

          // Reset status to pending for retry
          await supabase
            .from('audio_tracks')
            .update({ moderation_status: 'pending_check' })
            .eq('id', track.id);
        }

        // Add delay between tracks to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (trackError) {
        console.error(`Error processing track ${track.id}:`, trackError);
        errors++;

        // Reset status to pending for retry
        await supabase
          .from('audio_tracks')
          .update({ moderation_status: 'pending_check' })
          .eq('id', track.id);
      }
    }

    console.log(`\n✅ Batch processing complete:`);
    console.log(`   - Processed: ${processed}`);
    console.log(`   - Flagged: ${flagged}`);
    console.log(`   - Errors: ${errors}`);

    return { processed, flagged, errors };

  } catch (error) {
    console.error('Error in processPendingModerationBatch:', error);
    throw error;
  }
}
