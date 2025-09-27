import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

// Upload types
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: any;
}

export interface AudioFileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
  duration?: number;
}

export interface ImageFileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
}

export class UploadService {
  
  // ============ FILE PICKING ============
  
  /**
   * Pick an audio file from device
   */
  async pickAudioFile(): Promise<AudioFileInfo | null> {
    try {
      // Request permission first
      const permissionResult = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (permissionResult.canceled) {
        return null;
      }

      const file = permissionResult.assets[0];
      
      return {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'audio/mpeg',
        size: file.size || 0,
      };
    } catch (error) {
      console.error('Error picking audio file:', error);
      throw error;
    }
  }

  /**
   * Pick an image from camera or gallery
   */
  async pickImage(source: 'camera' | 'gallery' = 'gallery'): Promise<ImageFileInfo | null> {
    try {
      let result;

      if (source === 'camera') {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission denied');
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        // Request gallery permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Gallery permission denied');
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      
      return {
        uri: asset.uri,
        name: `image_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: asset.fileSize || 0,
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  // ============ SUPABASE STORAGE UPLOAD ============

  /**
   * Upload file to Supabase storage
   */
  private async uploadToStorage(
    bucket: string,
    filePath: string,
    fileUri: string,
    fileType: string
  ): Promise<UploadResult> {
    try {
      // Convert file URI to blob for upload
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Create file object
      const file = new File([blob], filePath, { type: fileType });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: publicUrlData.publicUrl,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Upload audio track
   */
  async uploadAudioTrack(
    file: AudioFileInfo,
    userId: string,
    trackId?: string
  ): Promise<UploadResult> {
    try {
      const fileExtension = file.name.split('.').pop() || 'mp3';
      const fileName = trackId || `audio_${Date.now()}`;
      const filePath = `tracks/${userId}/${fileName}.${fileExtension}`;

      console.log('🎵 Uploading audio track:', filePath);

      const result = await this.uploadToStorage(
        'audio-tracks',
        filePath,
        file.uri,
        file.type
      );

      if (result.success) {
        console.log('✅ Audio upload successful:', result.url);
      }

      return result;
    } catch (error) {
      console.error('Error uploading audio track:', error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(
    file: ImageFileInfo,
    userId: string
  ): Promise<UploadResult> {
    try {
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${userId}/avatar.${fileExtension}`;

      console.log('🖼️ Uploading avatar:', filePath);

      const result = await this.uploadToStorage(
        'user-avatars',
        filePath,
        file.uri,
        file.type
      );

      if (result.success) {
        console.log('✅ Avatar upload successful:', result.url);
      }

      return result;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Upload track cover image
   */
  async uploadTrackCover(
    file: ImageFileInfo,
    userId: string,
    trackId?: string
  ): Promise<UploadResult> {
    try {
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = trackId || `cover_${Date.now()}`;
      const filePath = `track-covers/${userId}/${fileName}.${fileExtension}`;

      console.log('🎨 Uploading track cover:', filePath);

      const result = await this.uploadToStorage(
        'track-covers',
        filePath,
        file.uri,
        file.type
      );

      if (result.success) {
        console.log('✅ Track cover upload successful:', result.url);
      }

      return result;
    } catch (error) {
      console.error('Error uploading track cover:', error);
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Upload event cover image
   */
  async uploadEventCover(
    file: ImageFileInfo,
    userId: string,
    eventId?: string
  ): Promise<UploadResult> {
    try {
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = eventId || `event_${Date.now()}`;
      const filePath = `event-covers/${userId}/${fileName}.${fileExtension}`;

      console.log('🎪 Uploading event cover:', filePath);

      const result = await this.uploadToStorage(
        'event-covers',
        filePath,
        file.uri,
        file.type
      );

      if (result.success) {
        console.log('✅ Event cover upload successful:', result.url);
      }

      return result;
    } catch (error) {
      console.error('Error uploading event cover:', error);
      return {
        success: false,
        error,
      };
    }
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Get audio duration from file
   */
  async getAudioDuration(fileUri: string): Promise<number | null> {
    try {
      // This would require additional libraries like expo-av
      // For now, return null and handle in the audio player
      return null;
    } catch (error) {
      console.error('Error getting audio duration:', error);
      return null;
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSizeBytes: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSizeBytes <= maxSizeBytes;
  }

  /**
   * Validate audio file type
   */
  validateAudioType(mimeType: string): boolean {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/aac',
      'audio/ogg',
      'audio/flac'
    ];
    return allowedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Validate image file type
   */
  validateImageType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    return allowedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============ BATCH OPERATIONS ============

  /**
   * Upload multiple files with progress tracking
   */
  async uploadMultipleFiles(
    files: { file: AudioFileInfo | ImageFileInfo; type: 'audio' | 'image' }[],
    userId: string,
    onProgress?: (progress: number, completed: number, total: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const { file, type } = files[i];
      
      let result: UploadResult;
      
      if (type === 'audio') {
        result = await this.uploadAudioTrack(file as AudioFileInfo, userId);
      } else {
        result = await this.uploadTrackCover(file as ImageFileInfo, userId);
      }
      
      results.push(result);
      
      // Call progress callback
      if (onProgress) {
        const progress = ((i + 1) / total) * 100;
        onProgress(progress, i + 1, total);
      }
    }

    return results;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      console.log('🗑️ File deleted:', filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
}

// Export singleton instance
export const uploadService = new UploadService();
