import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { uploadValidationService } from '../../../src/lib/upload-validation';
import type { UploadValidationRequest } from '../../../src/lib/types/upload-validation';
import { validateAudioFile, type AudioMetadata } from '../../../src/lib/audio-moderation-utils';
import { createR2PutObjectCommand, buildR2PublicUrl, r2Client } from '@/src/lib/r2-client';
import { createSafeObjectKey, validateAudioUploadInput } from '@/src/lib/audio-upload-security';
import {
  canUserUploadNow,
  effectiveTierToValidationTier,
  fetchProfileAndActiveSubscriptionTier,
} from '@/src/lib/upload-entitlement';
import { resolveEffectiveTier } from '@/src/lib/effective-subscription-tier';

export async function POST(request: NextRequest) {
  try {
    console.log('🎵 Upload API called with validation integration');
    
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { profile, subscriptionTier } = await fetchProfileAndActiveSubscriptionTier(
      supabase,
      user.id,
    );
    const effectiveTier = resolveEffectiveTier(profile, subscriptionTier || 'free');
    const userTier = effectiveTierToValidationTier(effectiveTier);
    console.log('User tier (effective):', effectiveTier, 'validation:', userTier);

    const body = await request.json();
    const {
      title,
      artistName,
      description,
      genre,
      tags,
      privacy,
      publishOption,
      scheduleDate,
      audioFileUrl,
      coverArtUrl,
      duration,
      lyrics,
      lyricsLanguage,
      // Cover song fields
      isCover,
      isrcCode,
      // ISRC auto-assignment (WEB_TEAM_ISRC_AUTO_ASSIGNMENT)
      isrc_source,
      original_artist_name,
      original_song_title,
      suspected_duplicate,
      // New validation fields
      fileData,
      validationPassed,
      validationId,
      // Audio quality fields
      audioQuality,
      bitrate,
      sampleRate,
      channels,
      codec,
      // ACRCloud fields
      acrcloudData,
      contentType,
      is_mixtape,
      dj_name,
      tracklist
    } = body;

    // Validate required fields
    const isMixtapeUpload = contentType === 'mixtape' || is_mixtape === true;
    if (!title || (!isMixtapeUpload && !artistName) || (isMixtapeUpload && !(dj_name || artistName))) {
      return NextResponse.json(
        { error: 'Title and artist name are required' },
        { status: 400 }
      );
    }
    if (isMixtapeUpload && !tracklist?.trim()) {
      return NextResponse.json({ error: 'tracklist is required for mixtape uploads' }, { status: 400 });
    }

    let resolvedAudioFileUrl = typeof audioFileUrl === 'string' ? audioFileUrl : '';

    // If frontend did not pre-upload the file, upload from base64 payload to R2.
    if (!resolvedAudioFileUrl && fileData) {
      try {
        const file = await createFileFromBase64(fileData);
        const inputValidation = validateAudioUploadInput(file, isMixtapeUpload ? 'mixtape' : 'music');
        if (!inputValidation.valid) {
          return NextResponse.json({ error: inputValidation.message }, { status: 400 });
        }

        const objectKey = createSafeObjectKey(user.id, file.name);
        const body = Buffer.from(await file.arrayBuffer());
        await r2Client.send(
          createR2PutObjectCommand({
            objectKey,
            body,
            contentType: file.type || 'application/octet-stream',
            contentLength: body.byteLength,
          })
        );
        resolvedAudioFileUrl = buildR2PublicUrl(objectKey);
      } catch (r2UploadError) {
        console.error('❌ Failed to upload audio payload to R2:', r2UploadError);
        return NextResponse.json(
          { error: 'Audio upload failed. Please retry your upload.' },
          { status: 502 }
        );
      }
    }

    if (!resolvedAudioFileUrl) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Cover/original metadata: original artist/title required when cover
    if (isCover && !isMixtapeUpload) {
      if (!original_artist_name || !String(original_artist_name).trim()) {
        return NextResponse.json(
          { error: 'Original artist name is required for cover songs' },
          { status: 400 }
        );
      }
      if (!original_song_title || !String(original_song_title).trim()) {
        return NextResponse.json(
          { error: 'Original song title is required for cover songs' },
          { status: 400 }
        );
      }
    }
    // If user provided ISRC, validate format
    if (isrc_source === 'user_provided' && isrcCode?.trim()) {
      const normalizedISRC = String(isrcCode).replace(/[-\s]/g, '').toUpperCase();
      if (normalizedISRC.length !== 12) {
        return NextResponse.json(
          { error: 'Invalid ISRC format. Should be 12 characters (e.g. XX-XXX-YY-NNNNN)' },
          { status: 400 }
        );
      }
    }

    // Enhanced validation check if validation data is provided
    if (fileData && !validationPassed) {
      console.log('🔍 Performing upload validation...');
      
      try {
        // Create File object from base64 data
        const file = await createFileFromBase64(fileData);
        
        // Check storage limits
        const { data: storageCheck } = await supabase
          .rpc('check_storage_limit', { 
            user_uuid: user.id, 
            file_size: file.size 
          });
        
        if (!storageCheck) {
          return NextResponse.json(
            { 
              error: 'Storage limit exceeded',
              details: 'You have reached your storage limit. Please delete some files or upgrade your plan.'
            },
            { status: 413 }
          );
        }
        
        const { allowed: uploadAllowed, limitRow } = await canUserUploadNow(supabase, user.id);

        if (!uploadAllowed) {
          return NextResponse.json(
            {
              error: 'Upload limit exceeded',
              details:
                effectiveTier === 'free'
                  ? 'You have reached your limit of 3 lifetime uploads. Upgrade to Premium for more uploads each month.'
                  : effectiveTier === 'premium'
                    ? `You have reached your limit of ${limitRow?.uploads_limit ?? 7} uploads this month.`
                    : 'You have reached your upload limit.',
              limit: limitRow || null,
              upgrade_required: effectiveTier === 'free',
            },
            { status: 429 },
          );
        }

        // Perform validation
        const validationRequest: UploadValidationRequest = {
          file,
          metadata: {
            title,
            description,
            genre,
            tags: tags ? tags.split(',').map((t: any) => t.trim()) : [],
            privacy,
            publishOption,
            scheduleDate
          },
          userId: user.id,
          userTier: userTier as 'free' | 'pro',
          isMixtape: isMixtapeUpload,
          config: {
            enableCopyrightCheck: false, // Start with basic validation
            enableContentModeration: false,
            enableCommunityGuidelines: true,
            enableMetadataValidation: true,
            enableFileIntegrityCheck: true,
            strictMode: false // No strict mode - Enterprise removed
          }
        };
        
        const validationResult = await uploadValidationService.validateUpload(validationRequest);
        
        if (!validationResult.result.isValid) {
          return NextResponse.json(
            { 
              error: 'Upload validation failed',
              validationErrors: validationResult.result.errors,
              validationWarnings: validationResult.result.warnings
            },
            { status: 400 }
          );
        }
        
        console.log('✅ Upload validation passed');
        
      } catch (validationError) {
        console.error('❌ Upload validation error:', validationError);
        return NextResponse.json(
          { error: 'Upload validation failed' },
          { status: 400 }
        );
      }
    }

    // Validate privacy setting
    if (!['public', 'followers', 'private'].includes(privacy)) {
      return NextResponse.json(
        { error: 'Invalid privacy setting' },
        { status: 400 }
      );
    }

    // Validate publish option
    if (!['now', 'schedule', 'draft'].includes(publishOption)) {
      return NextResponse.json(
        { error: 'Invalid publish option' },
        { status: 400 }
      );
    }

    // Validate schedule date if scheduling
    if (publishOption === 'schedule' && !scheduleDate) {
      return NextResponse.json(
        { error: 'Schedule date is required when scheduling' },
        { status: 400 }
      );
    }

    // Enhanced audio validation with moderation utilities (Phase 2)
    let audioValidationResult;
    let fileHash: string | null = null;
    let audioMetadata: any = null;
    let fileSizeBytes: number | null = null;

    if (fileData) {
      try {
        console.log('🔍 Running enhanced audio validation...');

        // Create File object from base64 data for validation
        const file = await createFileFromBase64(fileData);
        fileSizeBytes = file.size;

        // Client metadata from request
        const clientMetadata: Partial<AudioMetadata> = {
          duration,
          bitrate,
          sampleRate,
          channels,
          codec,
        };

        // Run comprehensive audio validation
        audioValidationResult = await validateAudioFile(
          file,
          supabase,
          user.id,
          clientMetadata
        );

        if (!audioValidationResult.isValid) {
          console.warn('⚠️ Audio validation issues found:', audioValidationResult.qualityIssues);
          return NextResponse.json(
            {
              error: 'Audio validation failed',
              validationErrors: audioValidationResult.qualityIssues,
              validationWarnings: audioValidationResult.warnings
            },
            { status: 400 }
          );
        }

        fileHash = audioValidationResult.fileHash;
        audioMetadata = audioValidationResult.metadata;
        if (audioMetadata?.size) {
          fileSizeBytes = audioMetadata.size;
        }

        console.log('✅ Enhanced audio validation passed');

        // Log warnings if any
        if (audioValidationResult.warnings.length > 0) {
          console.log('⚠️ Audio quality warnings:', audioValidationResult.warnings);
        }

      } catch (validationError) {
        console.error('❌ Enhanced audio validation error:', validationError);
        // Continue with upload but log the error
        // Don't block upload if hash calculation fails
      }
    }

    // Resolve ISRC per WEB_TEAM_ISRC_AUTO_ASSIGNMENT: acrcloud_detected | user_provided | soundbridge_generated
    // Mixtapes intentionally do not require ISRC assignment.
    const registrantCode = (process.env.ISRC_REGISTRANT_CODE || 'SBR').trim() || 'SBR';
    let assignedIsrc: string | null = null;
    let assignedSource: 'user_provided' | 'acrcloud_detected' | 'soundbridge_generated' | null = null;
    if (isMixtapeUpload) {
      assignedIsrc = null;
      assignedSource = null;
    } else if (isrc_source === 'acrcloud_detected' && acrcloudData?.detectedISRC) {
      assignedIsrc = String(acrcloudData.detectedISRC).replace(/[-\s]/g, '').toUpperCase().substring(0, 12);
      assignedSource = 'acrcloud_detected';
    } else if (isrc_source === 'user_provided' && isrcCode?.trim()) {
      assignedIsrc = String(isrcCode).replace(/[-\s]/g, '').toUpperCase().substring(0, 12);
      assignedSource = 'user_provided';
    } else {
      const { data: generated } = await supabase.rpc('generate_soundbridge_isrc', { p_registrant: registrantCode });
      assignedIsrc = generated as string;
      assignedSource = 'soundbridge_generated';
    }

    // Determine release status based on ACRCloud and cover song data
    function determineReleaseStatus(acrData: any, isCoverSong: boolean): string {
      if (isCoverSong) {
        return 'cover';
      }
      if (acrData?.matchFound) {
        if (acrData?.artistMatch?.match && acrData?.detectedISRCVerified) {
          return 'released_verified';
        }
        return 'pending_review'; // Match found but needs verification
      }
      if (acrData?.isUnreleased) {
        return 'unreleased_original';
      }
      return 'pending_review'; // Default fallback
    }

    // Create audio track record
    if (!fileSizeBytes && fileData) {
      fileSizeBytes = getBase64Size(fileData);
    }

    const trackData: any = {
      title: title.trim(),
      artist_name: (isMixtapeUpload ? (dj_name || artistName) : artistName).trim(),
      description: description?.trim() || null,
      creator_id: user.id,
      file_url: resolvedAudioFileUrl,
      cover_art_url: coverArtUrl || null,
      duration: duration || 0,
      genre: genre || null,
      tags: tags || null,
      lyrics: lyrics?.trim() || null,
      lyrics_language: lyricsLanguage || 'en',
      is_public: suspected_duplicate ? false : (privacy === 'public'),
      // Cover song fields
      is_cover: isMixtapeUpload ? false : (isCover || false),
      isrc_code: assignedIsrc,
      isrc_source: assignedSource,
      isrc_soundbridge_generated: assignedSource === 'soundbridge_generated',
      isrc_verified: assignedSource === 'acrcloud_detected' ? (acrcloudData?.detectedISRCVerified || false) : (assignedSource === 'user_provided'),
      isrc_verified_at: (assignedSource === 'acrcloud_detected' && acrcloudData?.detectedISRCVerified) || assignedSource === 'user_provided' ? new Date().toISOString() : null,
      // Original work (covers / match)
      original_artist_name: original_artist_name?.trim() || null,
      original_song_title: original_song_title?.trim() || null,
      suspected_duplicate: !!suspected_duplicate,
      // ACRCloud fields
      acrcloud_checked: isMixtapeUpload ? false : (acrcloudData ? true : false),
      acrcloud_match_found: acrcloudData?.matchFound || false,
      acrcloud_detected_artist: acrcloudData?.detectedArtist || null,
      acrcloud_detected_title: acrcloudData?.detectedTitle || null,
      acrcloud_detected_isrc: acrcloudData?.detectedISRC || null,
      acrcloud_detected_album: acrcloudData?.detectedAlbum || null,
      acrcloud_detected_label: acrcloudData?.detectedLabel || null,
      acrcloud_checked_at: acrcloudData ? new Date().toISOString() : null,
      acrcloud_response_data: acrcloudData?.rawResponse || null,
      // Ownership verification fields
      is_released: acrcloudData?.matchFound || false,
      release_status: determineReleaseStatus(acrcloudData, isCover || false),
      ownership_verified: (acrcloudData?.artistMatch?.match && (isCover ? (isrcCode ? true : false) : acrcloudData?.detectedISRCVerified)) || false,
      ownership_verified_at: (acrcloudData?.artistMatch?.match && (isCover ? (isrcCode ? true : false) : acrcloudData?.detectedISRCVerified)) ? new Date().toISOString() : null,
      artist_name_match: acrcloudData?.artistMatch?.match || null,
      artist_name_match_confidence: acrcloudData?.artistMatchConfidence || null,
      // Audio quality fields
      audio_quality: audioQuality || 'standard',
      bitrate: bitrate || 128,
      sample_rate: sampleRate || 44100,
      channels: channels || 2,
      codec: codec || 'mp3',
      file_size: fileSizeBytes,
      processing_status: 'completed',
      processing_completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      // NEW: Content moderation fields (Phase 2)
      moderation_status: 'pending_check', // Will be checked by background job
      file_hash: fileHash,
      audio_metadata: audioMetadata ? {
        bitrate: audioMetadata.bitrate,
        sampleRate: audioMetadata.sampleRate,
        channels: audioMetadata.channels,
        format: audioMetadata.format,
        codec: audioMetadata.codec,
        size: audioMetadata.size
      } : null,
      is_mixtape: isMixtapeUpload,
      dj_name: isMixtapeUpload ? String(dj_name || artistName || '').trim() : null,
      tracklist: isMixtapeUpload ? String(tracklist || '').trim() : null
    };

    const { data: track, error: insertError } = await (supabase
      .from('audio_tracks') as any)
      .insert([trackData])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create track record' },
        { status: 500 }
      );
    }

    // Log successful upload for statistics
    await supabase.rpc('update_user_upload_stats', {
      user_uuid: user.id,
      upload_success: true,
      file_size: fileSizeBytes || 0,
      user_tier: userTier
    });

    console.log('✅ Upload completed successfully');

    return NextResponse.json({
      success: true,
      track: {
        id: track.id,
        title: track.title,
        file_url: track.file_url,
        cover_art_url: track.cover_art_url,
        duration: track.duration,
        created_at: track.created_at
      },
      tier: userTier
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to create File object from base64 data
async function createFileFromBase64(base64Data: string): Promise<File> {
  try {
    // Parse base64 data (format: "data:audio/mp3;base64,iVBORw0KGgoAAAANSUhEUgAA...")
    const [header, data] = base64Data.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp3';
    const extensionMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/m4a': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/mp4': 'm4a',
      'audio/flac': 'flac',
      'audio/ogg': 'ogg',
    };
    const fileExtension = extensionMap[mimeType] || 'mp3';
    
    // Convert base64 to binary
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create File object
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], `uploaded-file.${fileExtension}`, { type: mimeType });
    
    return file;
  } catch (error) {
    throw new Error('Invalid file data format');
  }
}

function getBase64Size(base64Data: string): number | null {
  try {
    const commaIndex = base64Data.indexOf(',');
    const base64String = commaIndex >= 0 ? base64Data.slice(commaIndex + 1) : base64Data;
    if (!base64String) {
      return null;
    }
    const paddingMatch = base64String.match(/=+$/);
    const padding = paddingMatch ? paddingMatch[0].length : 0;
    const size = Math.floor((base64String.length * 3) / 4) - padding;
    return Math.max(0, size);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's tracks
    const { data: tracks, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tracks: tracks || []
    });

  } catch (error) {
    console.error('Get tracks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 