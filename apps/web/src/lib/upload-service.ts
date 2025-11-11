// @ts-nocheck
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
  private supabase = createBrowserClient();

  // Validate audio file
  validateAudioFile(file: File, userTier: 'free' | 'pro' | 'enterprise' = 'free'): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = userTier === 'free' ? 10 * 1024 * 1024 : 
                   userTier === 'pro' ? 50 * 1024 * 1024 : 
                   100 * 1024 * 1024; // enterprise
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
      'audio/flac'
    ];

    if (file.size > maxSize) {
      const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
      errors.push(`File size must be less than ${limitMB}MB for ${userTier} tier (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload MP3, WAV, M4A, AAC, or FLAC files.');
    }

    return {
      isValid: errors.length === 0,
      errors
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
      const { data, error } = await this.supabase.storage
        .from('audio-tracks')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            if (onProgress) {
              onProgress({
                loaded: progress.loaded,
                total: progress.total,
                percentage: (progress.loaded / progress.total) * 100
              });
            }
          }
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
      
      const { data, error } = await this.supabase.storage
        .from('cover-art')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            if (onProgress) {
              onProgress({
                loaded: progress.loaded,
                total: progress.total,
                percentage: (progress.loaded / progress.total) * 100
              });
            }
          }
        });

      if (error) {
        console.error('❌ Cover art upload error:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error,
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
    file_url: string;
    cover_art_url?: string;
    duration: number;
    genre?: string;
    tags?: string[];
    is_public: boolean;
    // Audio quality fields
    audioQuality?: string;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    codec?: string;
  }): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const insertData = {
        ...trackData,
        audio_quality: trackData.audioQuality || 'standard',
        bitrate: trackData.bitrate || 128,
        sample_rate: trackData.sampleRate || 44100,
        channels: trackData.channels || 2,
        codec: trackData.codec || 'mp3'
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
          onProgress: (progress) => onProgress?.('processing', {
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

      // Create database record
      const dbResult = await this.createAudioTrackRecord({
        title: trackData.title,
        description: trackData.description,
        creator_id: userId,
        file_url: audioResult.url!,
        cover_art_url: coverArtUrl,
        duration: (trackData.audioFile.metadata as AudioMetadata)?.duration || 0,
        genre: trackData.genre,
        tags: trackData.tags,
        lyrics: trackData.lyrics || null,
        lyrics_language: trackData.lyricsLanguage || 'en',
        is_public: trackData.privacy === 'public',
        // Audio quality information
        audio_quality: qualitySettings?.level || 'standard',
        bitrate: qualitySettings?.bitrate || 128,
        sample_rate: qualitySettings?.sampleRate || 44100,
        channels: qualitySettings?.channels || 2,
        codec: qualitySettings?.codec || 'mp3'
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