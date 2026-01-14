import { createBrowserClient } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import type {
  UploadFile,
  FileMetadata,
  AudioMetadata,
  ImageMetadata,
  UploadProgress,
  UploadResult,
  BatchUploadResult,
  FileValidationResult,
  AudioValidationResult,
  ImageValidationResult,
  UploadConfig,
  StorageBucket
} from './types/upload';

// Storage bucket configurations
export const STORAGE_BUCKETS: Record<string, StorageBucket> = {
  'audio-tracks': {
    id: 'audio-tracks',
    name: 'audio-tracks',
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB (max for enterprise)
    allowedMimeTypes: [
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
    ]
  },
  'cover-art': {
    id: 'cover-art',
    name: 'cover-art',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif'
    ]
  },
  'profile-images': {
    id: 'profile-images',
    name: 'profile-images',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif'
    ]
  },
  'event-images': {
    id: 'event-images',
    name: 'event-images',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif'
    ]
  }
};

// File validation functions
export function validateAudioFile(file: File, userTier: 'free' | 'premium' | 'unlimited' = 'free'): AudioValidationResult {
  const result: AudioValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const bucket = STORAGE_BUCKETS['audio-tracks'];
  
  // File size limits by subscription tier (matching mobile app)
  const FILE_SIZE_LIMITS = {
    free: 50 * 1024 * 1024,      // 50MB
    premium: 200 * 1024 * 1024,   // 200MB
    unlimited: 500 * 1024 * 1024, // 500MB
  };
  
  const tierLimit = FILE_SIZE_LIMITS[userTier] || FILE_SIZE_LIMITS.free;

  // Check file size against tier limit
  if (file.size > tierLimit) {
    result.isValid = false;
    const limitMB = (tierLimit / (1024 * 1024)).toFixed(0);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    result.errors.push(`File size (${fileSizeMB}MB) exceeds your ${userTier} plan limit (${limitMB}MB). Upgrade your plan to upload larger files.`);
  }

  // Check file type
  if (!bucket.allowedMimeTypes.includes(file.type)) {
    result.isValid = false;
    result.errors.push('Invalid file type. Please upload MP3, WAV, M4A, AAC, or FLAC files.');
  }

  // Check file name
  if (file.name.length > 255) {
    result.errors.push('File name is too long');
  }

  return result;
}

export function validateImageFile(file: File): ImageValidationResult {
  const result: ImageValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const bucket = STORAGE_BUCKETS['cover-art'];

  // Check file size
  if (file.size > bucket.fileSizeLimit) {
    result.isValid = false;
    result.errors.push(`File size must be less than ${bucket.fileSizeLimit / 1024 / 1024}MB`);
  }

  // Check file type
  if (!bucket.allowedMimeTypes.includes(file.type)) {
    result.isValid = false;
    result.errors.push('Invalid file type. Please upload JPG, PNG, WebP, or AVIF files.');
  }

  return result;
}

// File metadata extraction
export async function extractAudioMetadata(file: File): Promise<AudioMetadata> {
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

export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
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
export function generateUniqueFilename(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${userId}/${timestamp}_${randomString}.${extension}`;
}

// Upload file to Supabase storage
export async function uploadFile(
  file: File,
  bucketId: string,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase.storage
      .from(bucketId)
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketId)
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
      metadata: {
        size: file.size,
        mimeType: file.type
      }
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

// Upload audio file with metadata
export async function uploadAudioFile(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file
  const validation = validateAudioFile(file);
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
    metadata = await extractAudioMetadata(file);
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
  const path = generateUniqueFilename(file.name, userId);

  // Upload file
  const result = await uploadFile(file, 'audio-tracks', path, onProgress);

  if (result.success) {
    return {
      ...result,
      metadata
    };
  }

  return result;
}

// Upload image file with metadata
export async function uploadImageFile(
  file: File,
  bucketId: 'cover-art' | 'profile-images' | 'event-images',
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file
  const validation = validateImageFile(file);
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
    metadata = await extractImageMetadata(file);
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
  const path = generateUniqueFilename(file.name, userId);

  // Upload file
  const result = await uploadFile(file, bucketId, path, onProgress);

  if (result.success) {
    return {
      ...result,
      metadata
    };
  }

  return result;
}

// Batch upload multiple files
export async function batchUploadFiles(
  files: File[],
  bucketId: string,
  userId: string,
  onProgress?: (fileId: string, progress: UploadProgress) => void
): Promise<BatchUploadResult> {
  const results: UploadFile[] = [];
  const errors: any[] = [];
  let successfulUploads = 0;
  let failedUploads = 0;

  for (const file of files) {
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    try {
      let result: UploadResult;

      if (bucketId === 'audio-tracks') {
        result = await uploadAudioFile(file, userId, (progress) => {
          if (onProgress) onProgress(fileId, progress);
        });
      } else {
        result = await uploadImageFile(
          file,
          bucketId as 'cover-art' | 'profile-images' | 'event-images',
          userId,
          (progress) => {
            if (onProgress) onProgress(fileId, progress);
          }
        );
      }

      if (result.success) {
        results.push({
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 100,
          status: 'success',
          url: result.url,
          metadata: result.metadata
        });
        successfulUploads++;
      } else {
        results.push({
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'error',
          error: result.error?.message
        });
        errors.push(result.error);
        failedUploads++;
      }
    } catch (error) {
      results.push({
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      errors.push(error);
      failedUploads++;
    }
  }

  return {
    success: failedUploads === 0,
    files: results,
    errors,
    totalFiles: files.length,
    successfulUploads,
    failedUploads
  };
}

// Delete uploaded file
export async function deleteUploadedFile(bucketId: string, path: string): Promise<boolean> {
  try {
    const supabase = createBrowserClient();
    
    const { error } = await supabase.storage
      .from(bucketId)
      .remove([path]);

    return !error;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

// Get file URL
export function getFileUrl(bucketId: string, path: string): string {
  const supabase = createBrowserClient();
  const { data } = supabase.storage
    .from(bucketId)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format upload speed
export function formatUploadSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

// Format time remaining
export function formatTimeRemaining(seconds: number): string {
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

// Generate waveform data (simplified - in production, use a proper audio analysis library)
export async function generateWaveformData(audioFile: File): Promise<number[]> {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of waveform points
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = blockSize * i;
          let sum = 0;
          
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j]);
          }
          
          waveform.push(sum / blockSize);
        }

        resolve(waveform);
      } catch (error) {
        console.error('Error generating waveform:', error);
        resolve([]);
      }
    };

    reader.readAsArrayBuffer(audioFile);
  });
}

// Compress image (simplified - in production, use a proper image compression library)
export async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
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