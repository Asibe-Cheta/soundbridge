import { createBrowserClient } from './supabase';
import type {
  UploadFile,
  UploadProgress,
  UploadResult,
  AudioMetadata,
  ImageMetadata,
  TrackUploadData
} from './types/upload';

// Audio upload service for SoundBridge
export class AudioUploadService {
  private supabase = createBrowserClient();

  // Validate audio file
  validateAudioFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
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
      errors.push(`File size must be less than 50MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
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
        const metadata: AudioMetadata = {
          duration: audio.duration,
          bitrate: Math.round((file.size * 8) / audio.duration), // rough estimate
          format: file.type,
          size: file.size,
          mimeType: file.type
        };

        URL.revokeObjectURL(url);
        resolve(metadata);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
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
        const metadata: ImageMetadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: file.type,
          size: file.size,
          mimeType: file.type
        };

        URL.revokeObjectURL(url);
        resolve(metadata);
      });

      img.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image file'));
      });

      img.src = url;
    });
  }

  // Generate unique filename
  generateUniqueFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${userId}/${timestamp}_${randomString}.${extension}`;
  }

  // Upload audio file to Supabase storage
  async uploadAudioFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateAudioFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join(', '),
            details: validation
          }
        };
      }

      // Extract metadata
      let metadata: AudioMetadata;
      try {
        metadata = await this.extractAudioMetadata(file);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'METADATA_ERROR',
            message: 'Failed to extract audio metadata',
            details: error
          }
        };
      }

      // Generate unique path
      const path = this.generateUniqueFilename(file.name, userId);

      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('audio-tracks')
        .upload(path, file, {
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

      // Get signed URL for private bucket
      const { data: urlData } = this.supabase.storage
        .from('audio-tracks')
        .createSignedUrl(path, 3600); // 1 hour expiry

      return {
        success: true,
        url: urlData?.signedUrl || '',
        metadata
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
      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join(', '),
            details: validation
          }
        };
      }

      // Extract metadata
      let metadata: ImageMetadata;
      try {
        metadata = await this.extractImageMetadata(file);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'METADATA_ERROR',
            message: 'Failed to extract image metadata',
            details: error
          }
        };
      }

      // Generate unique path
      const path = this.generateUniqueFilename(file.name, userId);

      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('cover-art')
        .upload(path, file, {
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

      // Get public URL for cover art
      const { data: urlData } = this.supabase.storage
        .from('cover-art')
        .getPublicUrl(path);

      return {
        success: true,
        url: urlData.publicUrl,
        metadata
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
  }): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      // Get session for API call
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session) {
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'No active session',
            details: null
          }
        };
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: trackData.title,
          description: trackData.description,
          genre: trackData.genre,
          tags: trackData.tags,
          privacy: trackData.is_public ? 'public' : 'private',
          publishOption: 'now',
          audioFileUrl: trackData.file_url,
          coverArtUrl: trackData.cover_art_url,
          duration: trackData.duration
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: result.error || 'Failed to create track record',
            details: result
          }
        };
      }

      return {
        success: true,
        data: result.track
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

  // Complete upload process
  async uploadTrack(
    trackData: TrackUploadData,
    userId: string,
    onProgress?: (type: 'audio' | 'cover', progress: UploadProgress) => void
  ): Promise<{ success: boolean; trackId?: string; error?: any }> {
    try {
      // Upload audio file
      const audioResult = await this.uploadAudioFile(
        trackData.audioFile.file,
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
        const coverResult = await this.uploadCoverArt(
          trackData.coverArtFile.file,
          userId,
          (progress) => onProgress?.('cover', progress)
        );

        if (coverResult.success) {
          coverArtUrl = coverResult.url;
        }
      }

      // Create database record
      const dbResult = await this.createAudioTrackRecord({
        title: trackData.title,
        description: trackData.description,
        creator_id: userId,
        file_url: audioResult.url!,
        cover_art_url: coverArtUrl,
        duration: (audioResult.metadata as AudioMetadata).duration,
        genre: trackData.genre,
        tags: trackData.tags,
        is_public: trackData.privacy === 'public'
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

      return {
        success: true,
        trackId: dbResult.data?.id
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

  // Delete file from storage
  async deleteFile(bucketId: string, fileUrl: string): Promise<boolean> {
    try {
      // Extract path from URL
      const path = fileUrl.split('/').pop();
      if (!path) return false;

      const { error } = await this.supabase.storage
        .from(bucketId)
        .remove([path]);

      return !error;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Get file URL
  getFileUrl(bucketId: string, path: string, signed: boolean = false): string {
    if (signed) {
      const { data } = this.supabase.storage
        .from(bucketId)
        .createSignedUrl(path, 3600);
      return data?.signedUrl || '';
    } else {
      const { data } = this.supabase.storage
        .from(bucketId)
        .getPublicUrl(path);
      return data.publicUrl;
    }
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format upload speed
  formatUploadSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  // Format time remaining
  formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

// Export singleton instance
export const audioUploadService = new AudioUploadService(); 