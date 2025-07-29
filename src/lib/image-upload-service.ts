import { createBrowserClient } from './supabase';
import type {
  UploadFile,
  UploadProgress,
  UploadResult,
  ImageMetadata
} from './types/upload';

// Image upload service for SoundBridge
export class ImageUploadService {
  private supabase = createBrowserClient();

  // Validate image file
  validateImageFile(file: File, maxSize: number = 5 * 1024 * 1024): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif'
    ];

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload JPG, PNG, WebP, or AVIF files.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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

  // Compress image using Canvas API
  async compressImage(file: File, quality: number = 0.8, maxWidth?: number, maxHeight?: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Resize if max dimensions are specified
        if (maxWidth || maxHeight) {
          const aspectRatio = width / height;

          if (maxWidth && width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }

          if (maxHeight && height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Draw image with high quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            file.type,
            quality
          );
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Generate unique filename
  generateUniqueFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${userId}/${timestamp}_${randomString}.${extension}`;
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

      // Compress image for better performance
      const compressedFile = await this.compressImage(file, 0.8, 1200, 1200);

      // Extract metadata
      let metadata: ImageMetadata;
      try {
        metadata = await this.extractImageMetadata(compressedFile);
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
      const path = this.generateUniqueFilename(compressedFile.name, userId);

      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('cover-art')
        .upload(path, compressedFile, {
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

  // Upload profile image (avatar or banner) to Supabase storage
  async uploadProfileImage(
    file: File,
    userId: string,
    type: 'avatar' | 'banner',
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

      // Compress image with appropriate dimensions
      const maxDimensions = type === 'avatar' ? { width: 400, height: 400 } : { width: 1200, height: 400 };
      const compressedFile = await this.compressImage(file, 0.8, maxDimensions.width, maxDimensions.height);

      // Extract metadata
      let metadata: ImageMetadata;
      try {
        metadata = await this.extractImageMetadata(compressedFile);
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
      const path = this.generateUniqueFilename(compressedFile.name, userId);

      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('profile-images')
        .upload(path, compressedFile, {
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

      // Get public URL for profile image
      const { data: urlData } = this.supabase.storage
        .from('profile-images')
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

  // Upload event image to Supabase storage
  async uploadEventImage(
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

      // Compress image for events (recommended 1200x600)
      const compressedFile = await this.compressImage(file, 0.8, 1200, 600);

      // Extract metadata
      let metadata: ImageMetadata;
      try {
        metadata = await this.extractImageMetadata(compressedFile);
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
      const path = this.generateUniqueFilename(compressedFile.name, userId);

      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('event-images')
        .upload(path, compressedFile, {
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

      // Get public URL for event image
      const { data: urlData } = this.supabase.storage
        .from('event-images')
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

  // Update profile with new image URL
  async updateProfileImage(userId: string, imageUrl: string, type: 'avatar' | 'banner'): Promise<{ success: boolean; error?: any }> {
    try {
      const updateData = type === 'avatar'
        ? { avatar_url: imageUrl }
        : { banner_url: imageUrl };

      const { data, error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
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
        success: true
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

  // Delete image from storage
  async deleteImage(bucketId: string, fileUrl: string): Promise<boolean> {
    try {
      // Extract path from URL
      const path = fileUrl.split('/').pop();
      if (!path) return false;

      const { error } = await this.supabase.storage
        .from(bucketId)
        .remove([path]);

      return !error;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Get image URL
  getImageUrl(bucketId: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucketId)
      .getPublicUrl(path);
    return data.publicUrl;
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

  // Create image preview URL
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  // Revoke preview URL
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const imageUploadService = new ImageUploadService(); 