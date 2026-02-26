import { createBrowserClient } from './supabase';
import type {
  UploadFile,
  UploadProgress,
  UploadResult,
  AudioMetadata,
  ImageMetadata,
  TrackUploadData
} from './types/upload';
import { copyrightService } from './copyright-service';
import type { AudioQualitySettings } from './types/audio-quality';
import { audioProcessingService } from './audio-processing-service';

// Audio upload service for SoundBridge
export class AudioUploadService {
  private _supabase: ReturnType<typeof createBrowserClient> | null = null;
  private get supabase() {
    if (!this._supabase) this._supabase = createBrowserClient();
    return this._supabase;
  }

  // Validate audio file
  validateAudioFile(file: File, userTier: 'free' | 'premium' | 'unlimited' = 'free'): { isValid: boolean; errors: string[]; warnings?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // File size limits by subscription tier (matching mobile app)
    const FILE_SIZE_LIMITS = {
      free: 50 * 1024 * 1024,      // 50MB
      premium: 200 * 1024 * 1024,   // 200MB
      unlimited: 500 * 1024 * 1024, // 500MB
    };
    
    const maxSize = FILE_SIZE_LIMITS[userTier] || FILE_SIZE_LIMITS.free;
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
      'audio/webm',
      'audio/flac',
      'audio/mp4', // Some MP4 files contain audio
      'video/mp4', // Some MP4 files are audio-only
      '' // Empty string for files without MIME type
    ];

    // Check file extension as fallback
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac', 'mp4'];
    const hasValidExtension = fileExtension && validExtensions.includes(fileExtension);

    if (file.size > maxSize) {
      const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`File size (${fileSizeMB}MB) exceeds your ${userTier} plan limit (${limitMB}MB). Upgrade your plan to upload larger files.`);
    }

    // Only validate MIME type if it's set and not empty
    // If MIME type is empty or invalid but extension is valid, allow it
    if (file.type && !allowedTypes.includes(file.type) && !hasValidExtension) {
      errors.push(`Invalid file type (${file.type}). Please upload MP3, WAV, M4A, AAC, OGG, WEBM, FLAC, or MP4 files.`);
    }

    // If file has no MIME type but has valid extension, that's okay
    if (!file.type && !hasValidExtension) {
      errors.push('Could not determine file type. Please ensure you are uploading an audio file (MP3, WAV, M4A, AAC, OGG, WEBM, FLAC, or MP4).');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Validate image file
  validateImageFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif'
    ];

    if (file.size > maxSize) {
      errors.push(`File size must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload JPG, PNG, WebP, or AVIF files.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Extract audio metadata
  async extractAudioMetadata(file: File): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve({
          duration: Math.round(audio.duration),
          bitrate: 128, // Default bitrate
          format: file.type,
          sampleRate: 44100, // Default sample rate
          channels: 2 // Default stereo
        });
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to extract audio metadata'));
      });

      audio.src = url;
    });
  }

  // Extract image metadata
  async extractImageMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.addEventListener('load', () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
          format: file.type,
          size: file.size
        });
      });

      img.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to extract image metadata'));
      });

      img.src = url;
    });
  }

  // Upload audio file to Supabase storage
  async uploadAudioFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      onProgress?.({
        loaded: 0,
        total: file.size,
        percentage: 0,
        stage: 'upload',
        message: 'Starting audio upload...',
        canCancel: false
      });

      const { data, error } = await this.supabase.storage
        .from('audio-tracks')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return {
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message,
            details: error
          }
        };
      }

      onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 100,
        stage: 'upload',
        message: 'Audio upload complete',
        canCancel: false
      });

      // Get public URL for the uploaded file
      const { data: urlData } = await this.supabase.storage
        .from('audio-tracks')
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData?.publicUrl || `https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/audio-tracks/${fileName}`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Upload failed',
          details: error
        }
      };
    }
  }

  // Upload cover art to Supabase storage
  async uploadCoverArt(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      console.log('🎨 Attempting to upload cover art:', {
        fileName,
        fileType: file.type,
        fileSize: file.size,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
      });
      
      onProgress?.({
        loaded: 0,
        total: file.size,
        percentage: 0,
        stage: 'upload',
        message: 'Starting cover art upload...',
        canCancel: false
      });

      const { data, error } = await this.supabase.storage
        .from('cover-art')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        const storageError = error as { message: string; statusCode?: number; error?: string };
        console.error('❌ Cover art upload error:', {
          message: storageError.message,
          statusCode: storageError.statusCode,
          error: storageError.error,
          details: error
        });
        return {
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message,
            details: error
          }
        };
      }

      // Get public URL
      const { data: urlData } = await this.supabase.storage
        .from('cover-art')
        .getPublicUrl(fileName);

      onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 100,
        stage: 'upload',
        message: 'Cover art upload complete',
        canCancel: false
      });

      return {
        success: true,
        url: urlData.publicUrl
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Upload failed',
          details: error
        }
      };
    }
  }

  // Create audio track record in database
  async createAudioTrackRecord(trackData: {
    title: string;
    description?: string;
    creator_id: string;
    artist_name: string;
    file_url: string;
    cover_art_url?: string;
    duration: number;
    genre?: string;
    tags?: string[];
    is_public: boolean;
    audio_quality?: string;
    bitrate?: number;
    sample_rate?: number;
    channels?: number;
    codec?: string;
    lyrics?: string | null;
    lyrics_language?: string | null;
    // ACRCloud fields
    acrcloud_checked?: boolean;
    acrcloud_match_found?: boolean;
    acrcloud_detected_artist?: string | null;
    acrcloud_detected_title?: string | null;
    acrcloud_detected_isrc?: string | null;
    acrcloud_detected_album?: string | null;
    acrcloud_detected_label?: string | null;
    acrcloud_checked_at?: string | null;
    acrcloud_response_data?: any;
    // Ownership verification fields
    is_released?: boolean;
    release_status?: string;
    ownership_verified?: boolean;
    ownership_verified_at?: string | null;
    artist_name_match?: boolean | null;
    artist_name_match_confidence?: number | null;
    // Cover song fields
    is_cover?: boolean;
    isrc_code?: string | null;
    isrc_verified?: boolean;
    isrc_verified_at?: string | null;
    // ISRC auto-assignment (WEB_TEAM_ISRC_AUTO_ASSIGNMENT)
    isrc_source?: 'user_provided' | 'acrcloud_detected' | 'soundbridge_generated';
    isrc_soundbridge_generated?: boolean;
    original_artist_name?: string | null;
    original_song_title?: string | null;
    suspected_duplicate?: boolean;
  }): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const insertData = {
        ...trackData,
        audio_quality: trackData.audio_quality ?? 'standard',
        bitrate: trackData.bitrate ?? 128,
        sample_rate: trackData.sample_rate ?? 44100,
        channels: trackData.channels ?? 2,
        codec: trackData.codec ?? 'mp3'
      };
      
      const { data, error } = await this.supabase
        .from('audio_tracks')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
            details: error
          }
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Database operation failed',
          details: error
        }
      };
    }
  }

  // Delete file from storage
  async deleteFile(bucket: string, filePath: string): Promise<void> {
    try {
      await this.supabase.storage.from(bucket).remove([filePath]);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  // Copyright checking methods
  async checkCopyright(data: {
    title: string;
    artist: string;
    album?: string;
    recordLabel?: string;
    userId: string;
  }): Promise<{
    allowed: boolean;
    risk: 'low' | 'medium' | 'high';
    reason?: string;
    requiresReview: boolean;
  }> {
    try {
      const response = await fetch('/api/copyright/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.error('Copyright check API error:', response.status);
        // If API fails, allow upload but flag for review
        return {
          allowed: true,
          risk: 'medium',
          reason: 'Copyright check service unavailable',
          requiresReview: true
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Copyright check error:', error);
      // If check fails, allow upload but flag for review
      return {
        allowed: true,
        risk: 'medium',
        reason: 'Copyright check failed',
        requiresReview: true
      };
    }
  }

  async flagContentForReview(title: string, reason: string, risk: 'low' | 'medium' | 'high') {
    try {
      await fetch('/api/copyright/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: 'pending', // Will be updated after upload
          reason: reason,
          risk: risk,
          flaggedBy: 'system'
        })
      });
    } catch (error) {
      console.error('Failed to flag content for review:', error);
    }
  }

  // Complete upload process with copyright checking and quality processing
  async uploadTrack(
    trackData: TrackUploadData,
    userId: string,
    qualitySettings?: AudioQualitySettings,
    onProgress?: (type: 'audio' | 'cover' | 'processing', progress: UploadProgress) => void
  ): Promise<{ success: boolean; trackId?: string; error?: any }> {
    try {
      // Copyright check before processing
      console.log('🔍 Performing copyright check...');
      onProgress?.('processing', {
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: 'copyright_check',
        progress: 0,
        message: 'Checking for copyright violations...',
        canCancel: false
      });

      const copyrightCheck = await this.checkCopyright({
        title: trackData.title,
        artist: trackData.artistName,
        album: trackData.album,
        recordLabel: trackData.recordLabel,
        userId: userId
      });

      if (!copyrightCheck.allowed) {
        console.warn('⚠️ Copyright check failed:', copyrightCheck.reason);
        return {
          success: false,
          error: {
            type: 'copyright_violation',
            message: copyrightCheck.reason,
            risk: copyrightCheck.risk,
            requiresReview: copyrightCheck.requiresReview
          }
        };
      }

      if (copyrightCheck.requiresReview) {
        console.log('📋 Content flagged for review:', copyrightCheck.reason);
        // Flag content for review but allow upload to proceed
        await this.flagContentForReview(trackData.title, copyrightCheck.reason, copyrightCheck.risk);
      }

      console.log('✅ Copyright check passed');
      onProgress?.('processing', {
        loaded: 100,
        total: 100,
        percentage: 100,
        stage: 'copyright_check',
        progress: 100,
        message: 'Copyright check completed',
        canCancel: false
      });

      let processedFile = trackData.audioFile.file;
      
      // Process audio for quality if settings provided
      if (qualitySettings) {
        console.log('🎵 Processing audio for quality:', qualitySettings.description);
        
          const processingResult = await audioProcessingService.processAudio({
          inputFile: trackData.audioFile.file,
          targetQuality: qualitySettings,
            onProgress: (progress) =>
              onProgress?.('processing', {
                loaded: progress,
                total: 100,
                percentage: progress,
                stage: 'processing',
                progress,
                message: `Processing audio to ${qualitySettings.description}...`,
                canCancel: false
              })
        });
        
        if (processingResult.success && processingResult.processedFile) {
          processedFile = processingResult.processedFile;
          console.log('✅ Audio processing completed');
        } else {
          console.warn('⚠️ Audio processing failed, using original file:', processingResult.error);
        }
      }
      
      // Upload audio file (processed or original)
      const audioResult = await this.uploadAudioFile(
        processedFile,
        userId,
        (progress) => onProgress?.('audio', progress)
      );

      if (!audioResult.success) {
        return {
          success: false,
          error: audioResult.error
        };
      }

      // Upload cover art if provided
      let coverArtUrl: string | undefined;
      if (trackData.coverArtFile) {
        console.log('🎨 Uploading cover art:', trackData.coverArtFile.file.name, 'Type:', trackData.coverArtFile.file.type);
        
        const coverResult = await this.uploadCoverArt(
          trackData.coverArtFile.file,
          userId,
          (progress) => onProgress?.('cover', progress)
        );

        if (coverResult.success) {
          coverArtUrl = coverResult.url;
          console.log('✅ Cover art uploaded successfully:', coverArtUrl);
        } else {
          console.error('❌ Cover art upload failed:', coverResult.error);
        }
      } else {
        console.log('ℹ️ No cover art file provided');
      }

      const td = trackData as any;
      const acr = td.acrcloudData;
      const isrcSource = td.isrc_source || (acr?.detectedISRC ? 'acrcloud_detected' : (td.isrcCode ? 'user_provided' : 'soundbridge_generated'));
      let resolvedIsrc: string | null = null;
      if (isrcSource === 'acrcloud_detected' && acr?.detectedISRC) {
        resolvedIsrc = String(acr.detectedISRC).replace(/[-\s]/g, '').toUpperCase().substring(0, 12);
      } else if (isrcSource === 'user_provided' && td.isrcCode) {
        resolvedIsrc = String(td.isrcCode).replace(/[-\s]/g, '').toUpperCase().substring(0, 12);
      } else if (isrcSource === 'soundbridge_generated') {
        try {
          const res = await fetch('/api/isrc/next', { method: 'POST' });
          if (!res.ok) throw new Error('ISRC generation failed');
          const json = await res.json();
          resolvedIsrc = json.isrc || null;
        } catch (err) {
          console.error('Failed to generate ISRC:', err);
          return { success: false, error: { code: 'ISRC_ERROR', message: 'Failed to generate ISRC' } };
        }
      }
      const suspectedDup = !!td.suspected_duplicate;

      // Create database record
      const dbResult = await this.createAudioTrackRecord({
        title: trackData.title,
        description: trackData.description,
        creator_id: userId,
        artist_name: trackData.artistName?.trim() || 'Unknown Artist',
        file_url: audioResult.url!,
        cover_art_url: coverArtUrl,
        duration: (trackData.audioFile.metadata as AudioMetadata)?.duration || 0,
        genre: trackData.genre,
        tags: trackData.tags,
        lyrics: trackData.lyrics || null,
        lyrics_language: trackData.lyricsLanguage || 'en',
        is_public: suspectedDup ? false : (trackData.privacy === 'public'),
        // Audio quality information
        audio_quality: qualitySettings?.level || 'standard',
        bitrate: qualitySettings?.bitrate || 128,
        sample_rate: qualitySettings?.sampleRate || 44100,
        channels: qualitySettings?.channels || 2,
        codec: qualitySettings?.codec || 'mp3',
        // ACRCloud fields (from trackData if provided)
        ...(acr ? {
          acrcloud_checked: true,
          acrcloud_match_found: acr.matchFound || false,
          acrcloud_detected_artist: acr.detectedArtist || null,
          acrcloud_detected_title: acr.detectedTitle || null,
          acrcloud_detected_isrc: acr.detectedISRC || null,
          acrcloud_detected_album: acr.detectedAlbum || null,
          acrcloud_detected_label: acr.detectedLabel || null,
          acrcloud_checked_at: new Date().toISOString(),
          acrcloud_response_data: acr.rawResponse || null,
          is_released: acr.matchFound || false,
          release_status: acr.matchFound
            ? (acr.artistMatch?.match && td.isCover ? 'released_verified' : 'pending_review')
            : (acr.isUnreleased ? 'unreleased_original' : 'pending_review'),
          ownership_verified: acr.artistMatch?.match && td.isCover ? true : false,
          ownership_verified_at: acr.artistMatch?.match && td.isCover ? new Date().toISOString() : null,
          artist_name_match: acr.artistMatch?.match || null,
          artist_name_match_confidence: acr.artistMatchConfidence || null
        } : {}),
        // Cover song fields
        is_cover: td.isCover || false,
        isrc_code: resolvedIsrc,
        isrc_source: isrcSource,
        isrc_soundbridge_generated: isrcSource === 'soundbridge_generated',
        isrc_verified: isrcSource === 'acrcloud_detected' ? !!acr?.detectedISRCVerified : (isrcSource === 'user_provided'),
        isrc_verified_at: (isrcSource === 'acrcloud_detected' && acr?.detectedISRCVerified) || isrcSource === 'user_provided' ? new Date().toISOString() : null,
        original_artist_name: td.original_artist_name?.trim() || null,
        original_song_title: td.original_song_title?.trim() || null,
        suspected_duplicate: suspectedDup
      });

      if (!dbResult.success) {
        // Clean up uploaded files if database insert fails
        if (audioResult.url) {
          await this.deleteFile('audio-tracks', audioResult.url);
        }
        if (coverArtUrl) {
          await this.deleteFile('cover-art', coverArtUrl);
        }

        return {
          success: false,
          error: dbResult.error
        };
      }

      // Perform copyright check after successful upload
      try {
        const copyrightCheck = await copyrightService.checkCopyrightViolation(
          dbResult.data.id,
          userId,
          trackData.audioFile.file
        );

        // Handle copyright check results
        if (copyrightCheck.isViolation) {
          console.warn('Copyright violation detected:', copyrightCheck);
          
          // Update copyright protection status based on recommendation
          if (copyrightCheck.recommendation === 'block') {
            await copyrightService.updateCopyrightStatus(dbResult.data.id, 'blocked');
            
            // Optionally, you could delete the track here or mark it as blocked
            // For now, we'll just log the violation
            console.log('Track blocked due to copyright violation');
          } else if (copyrightCheck.recommendation === 'flag') {
            await copyrightService.updateCopyrightStatus(dbResult.data.id, 'flagged');
            console.log('Track flagged for copyright review');
          }
        } else {
          // Mark as approved if no violation detected
          await copyrightService.updateCopyrightStatus(dbResult.data.id, 'approved');
        }
      } catch (copyrightError) {
        console.error('Error during copyright check:', copyrightError);
        // Don't fail the upload if copyright check fails
        // Just log the error and continue
      }

      return {
        success: true,
        trackId: dbResult.data.id
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Upload failed',
          details: error
        }
      };
    }
  }
}

// Export singleton instance
export const audioUploadService = new AudioUploadService(); 