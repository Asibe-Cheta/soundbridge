// Audio Moderation Utilities for SoundBridge
// Enhanced validation with file hash, metadata extraction, and quality checks

import crypto from 'crypto';
import { Readable } from 'stream';

/**
 * Audio metadata structure
 */
export interface AudioMetadata {
  duration: number; // in seconds
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  channels: number; // 1 = mono, 2 = stereo
  format: string; // mp3, wav, m4a, etc.
  codec?: string; // audio codec name
  size: number; // file size in bytes
}

/**
 * Audio validation result
 */
export interface AudioValidationResult {
  isValid: boolean;
  fileHash: string;
  metadata: AudioMetadata;
  qualityIssues: string[];
  warnings: string[];
}

/**
 * Calculate SHA-256 hash of audio file for duplicate detection
 * @param buffer - File buffer or Blob
 * @returns SHA-256 hash string
 */
export async function calculateFileHash(buffer: Buffer | Blob): Promise<string> {
  try {
    let dataBuffer: Buffer;

    if (buffer instanceof Blob) {
      // Convert Blob to Buffer
      const arrayBuffer = await buffer.arrayBuffer();
      dataBuffer = Buffer.from(arrayBuffer);
    } else {
      dataBuffer = buffer;
    }

    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256');
    hash.update(dataBuffer);
    return hash.digest('hex');
  } catch (error) {
    console.error('Error calculating file hash:', error);
    throw new Error('Failed to calculate file hash');
  }
}

/**
 * Extract basic audio metadata from file
 * Note: For server-side, we use basic file properties
 * For advanced metadata (duration, bitrate, etc.), client-side libraries are more reliable
 *
 * @param file - File object
 * @param clientMetadata - Optional metadata from client (more reliable for audio properties)
 * @returns Audio metadata object
 */
export async function extractAudioMetadata(
  file: File | Buffer,
  clientMetadata?: Partial<AudioMetadata>
): Promise<AudioMetadata> {
  const metadata: AudioMetadata = {
    duration: clientMetadata?.duration || 0,
    bitrate: clientMetadata?.bitrate || 0,
    sampleRate: clientMetadata?.sampleRate || 44100, // default CD quality
    channels: clientMetadata?.channels || 2, // default stereo
    format: clientMetadata?.format || 'unknown',
    codec: clientMetadata?.codec,
    size: 0
  };

  if (file instanceof File) {
    metadata.size = file.size;

    // Extract format from MIME type
    if (file.type) {
      const format = file.type.split('/')[1];
      if (format) {
        metadata.format = format.toUpperCase();
      }
    }

    // If client didn't provide metadata, we can only get basic info
    // Duration, bitrate, etc. require audio parsing libraries
    // These should be calculated on the client side before upload
  } else if (Buffer.isBuffer(file)) {
    metadata.size = file.length;
  }

  return metadata;
}

/**
 * Validate audio quality and detect potential issues
 * @param metadata - Audio metadata
 * @param fileSize - File size in bytes
 * @returns Quality issues and warnings
 */
export function validateAudioQuality(
  metadata: AudioMetadata,
  fileSize: number
): { qualityIssues: string[]; warnings: string[] } {
  const qualityIssues: string[] = [];
  const warnings: string[] = [];

  // Check if file size is suspiciously small for the duration
  if (metadata.duration > 0 && fileSize > 0) {
    const expectedMinSize = metadata.duration * 1000; // ~8kbps minimum
    if (fileSize < expectedMinSize) {
      qualityIssues.push('File size is too small for the reported duration. File may be corrupted.');
    }
  }

  // Check bitrate (if available)
  if (metadata.bitrate > 0) {
    if (metadata.bitrate < 32) {
      qualityIssues.push('Bitrate is extremely low (<32kbps). Audio quality will be very poor.');
    } else if (metadata.bitrate < 64) {
      warnings.push('Bitrate is low (<64kbps). Consider using a higher bitrate for better quality.');
    } else if (metadata.bitrate > 320) {
      warnings.push('Bitrate is very high (>320kbps). This may be unnecessary for most listeners.');
    }
  }

  // Check sample rate (if available)
  if (metadata.sampleRate > 0) {
    if (metadata.sampleRate < 22050) {
      warnings.push('Sample rate is low (<22kHz). Audio may sound muffled.');
    } else if (metadata.sampleRate > 96000) {
      warnings.push('Sample rate is very high (>96kHz). Most listeners cannot benefit from this.');
    }
  }

  // Check duration
  if (metadata.duration > 0) {
    if (metadata.duration < 10) {
      qualityIssues.push('Audio duration is too short (<10 seconds).');
    } else if (metadata.duration > 10800) { // 3 hours
      qualityIssues.push('Audio duration exceeds maximum limit (3 hours).');
    }
  } else {
    warnings.push('Could not determine audio duration. Please verify file integrity.');
  }

  // Check channels
  if (metadata.channels > 2) {
    warnings.push(`Audio has ${metadata.channels} channels. It will be converted to stereo for playback.`);
  }

  return { qualityIssues, warnings };
}

/**
 * Check for duplicate file by hash
 * @param supabase - Supabase client
 * @param fileHash - SHA-256 file hash
 * @param userId - Current user ID (to exclude own duplicates)
 * @returns Duplicate track info if found, null otherwise
 */
export async function checkDuplicateByHash(
  supabase: any,
  fileHash: string,
  userId: string
): Promise<{ isDuplicate: boolean; existingTrack?: any }> {
  try {
    const { data: duplicates, error } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id, created_at, is_public')
      .eq('file_hash', fileHash)
      .limit(1);

    if (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false };
    }

    if (duplicates && duplicates.length > 0) {
      const existingTrack = duplicates[0];

      // If it's the user's own upload, allow it (they might be re-uploading)
      if (existingTrack.creator_id === userId) {
        return {
          isDuplicate: false,
          existingTrack: {
            ...existingTrack,
            isOwnUpload: true
          }
        };
      }

      // If it's someone else's public upload, flag as duplicate
      if (existingTrack.is_public) {
        return {
          isDuplicate: true,
          existingTrack
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error in checkDuplicateByHash:', error);
    return { isDuplicate: false };
  }
}

/**
 * Comprehensive audio validation
 * Combines hash calculation, metadata extraction, quality checks, and duplicate detection
 *
 * @param file - File or Buffer to validate
 * @param supabase - Supabase client for duplicate check
 * @param userId - Current user ID
 * @param clientMetadata - Optional metadata from client
 * @returns Complete validation result
 */
export async function validateAudioFile(
  file: File | Buffer,
  supabase: any,
  userId: string,
  clientMetadata?: Partial<AudioMetadata>
): Promise<AudioValidationResult> {
  // Step 1: Calculate file hash
  const fileHash = await calculateFileHash(file instanceof File ? await file.arrayBuffer() : file);

  // Step 2: Extract metadata
  const metadata = await extractAudioMetadata(file, clientMetadata);

  // Step 3: Validate audio quality
  const { qualityIssues, warnings } = validateAudioQuality(
    metadata,
    file instanceof File ? file.size : file.length
  );

  // Step 4: Check for duplicates
  const { isDuplicate, existingTrack } = await checkDuplicateByHash(
    supabase,
    fileHash,
    userId
  );

  if (isDuplicate && existingTrack) {
    qualityIssues.push(
      `This file is a duplicate of "${existingTrack.title}" uploaded on ${new Date(existingTrack.created_at).toLocaleDateString()}`
    );
  }

  const isValid = qualityIssues.length === 0;

  return {
    isValid,
    fileHash,
    metadata,
    qualityIssues,
    warnings
  };
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Format duration to human-readable string (MM:SS or HH:MM:SS)
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format bitrate to human-readable string
 */
export function formatBitrate(kbps: number): string {
  return `${kbps} kbps`;
}
