import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { uploadValidationService } from '../../../src/lib/upload-validation';
import type { UploadValidationRequest } from '../../../src/lib/types/upload-validation';
import { validateAudioFile, type AudioMetadata } from '../../../src/lib/audio-moderation-utils';

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

    // Get user subscription tier
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const userTier = subscription?.tier || 'free';
    console.log('👤 User tier:', userTier);

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
      acrcloudData
    } = body;

    // Validate required fields
    if (!title || !artistName || !audioFileUrl) {
      return NextResponse.json(
        { error: 'Title, artist name, and audio file are required' },
        { status: 400 }
      );
    }

    // Validate cover song ISRC requirements
    if (isCover) {
      if (!isrcCode || !isrcCode.trim()) {
        return NextResponse.json(
          { error: 'ISRC code is required for cover songs' },
          { status: 400 }
        );
      }
      
      // Validate ISRC format (basic check - full validation done in frontend)
      const normalizedISRC = isrcCode.replace(/[-\s]/g, '').toUpperCase();
      if (normalizedISRC.length !== 12) {
        return NextResponse.json(
          { error: 'Invalid ISRC format. Should be 12 characters (XX-XXX-YY-NNNNN)' },
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
        
        // Check upload count limits
        const { data: uploadCheck } = await supabase
          .rpc('check_upload_count_limit', { 
            user_uuid: user.id 
          });
        
        if (!uploadCheck) {
          // Get upload limit info for better error message
          const { data: uploadLimitInfo } = await supabase
            .rpc('check_upload_limit', { user_uuid: user.id });
          
          return NextResponse.json(
            { 
              error: 'Upload limit exceeded',
              details: userTier === 'free' 
                ? 'You have reached your limit of 3 lifetime uploads. Upgrade to Pro for 10 total uploads.'
                : userTier === 'pro'
                ? 'You have reached your limit of 10 total uploads.'
                : 'You have reached your upload limit.',
              limit: uploadLimitInfo || null,
              upgrade_required: true
            },
            { status: 429 }
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

    if (fileData) {
      try {
        console.log('🔍 Running enhanced audio validation...');

        // Create File object from base64 data for validation
        const file = await createFileFromBase64(fileData);

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
    const trackData: any = {
      title: title.trim(),
      artist_name: artistName.trim(),
      description: description?.trim() || null,
      creator_id: user.id,
      file_url: audioFileUrl,
      cover_art_url: coverArtUrl || null,
      duration: duration || 0,
      genre: genre || null,
      tags: tags || null,
      lyrics: lyrics?.trim() || null,
      lyrics_language: lyricsLanguage || 'en',
      is_public: privacy === 'public',
      // Cover song fields
      is_cover: isCover || false,
      isrc_code: isCover && isrcCode ? isrcCode.replace(/[-\s]/g, '').toUpperCase().substring(0, 12) : (acrcloudData?.detectedISRC || null),
      isrc_verified: isCover && isrcCode ? true : (acrcloudData?.detectedISRCVerified || false),
      isrc_verified_at: (isCover && isrcCode) || acrcloudData?.detectedISRCVerified ? new Date().toISOString() : null,
      // ACRCloud fields
      acrcloud_checked: acrcloudData ? true : false,
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
      } : null
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
      file_size: track.file_url ? 0 : 0, // We'll need to get actual file size
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
    
    // Convert base64 to binary
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create File object
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], 'uploaded-file', { type: mimeType });
    
    return file;
  } catch (error) {
    throw new Error('Invalid file data format');
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