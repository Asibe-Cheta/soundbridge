import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { audioUploadService } from '../lib/upload-service';
import type { UploadFile, TrackUploadData } from '../lib/types/upload';
import type { AudioQualitySettings } from '../lib/types/audio-quality';

export interface UploadState {
  audioFile: UploadFile | null;
  coverArtFile: UploadFile | null;
  audioMetadata?: { duration: number };
  isUploading: boolean;
  uploadProgress: {
    audio: number;
    cover: number;
    processing: number;
  };
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
  successMessage: string | null;
}

export interface UploadActions {
  setAudioFile: (file: File | null) => void;
  setCoverArtFile: (file: File | null) => void;
  uploadTrack: (
    trackData: Omit<TrackUploadData, 'audioFile' | 'coverArtFile'>,
    qualitySettings?: AudioQualitySettings
  ) => Promise<{ success: boolean; trackId?: string }>;
  cancelUpload: () => void;
  resetUpload: () => void;
  validateFiles: () => { isValid: boolean; errors: string[] };
}

export function useAudioUpload(): [UploadState, UploadActions] {
  const { user } = useAuth();
  const [state, setState] = useState<UploadState>({
    audioFile: null,
    coverArtFile: null,
    audioMetadata: undefined,
    isUploading: false,
    uploadProgress: {
      audio: 0,
      cover: 0,
      processing: 0
    },
    uploadStatus: 'idle',
    error: null,
    successMessage: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const setAudioFile = useCallback((file: File | null) => {
    if (!file) {
      setState(prev => ({ ...prev, audioFile: null, audioMetadata: undefined }));
      return;
    }

    // Extract audio metadata for quality selection
    const extractMetadata = () => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        setState(prev => ({
          ...prev,
          audioMetadata: { duration: Math.round(audio.duration) }
        }));
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        console.warn('Could not extract audio metadata');
      });
      
      audio.src = url;
    };

    extractMetadata();

    // Get user tier for validation (async, but we'll validate after)
    const validateFile = async () => {
      let userTier: 'free' | 'premium' | 'unlimited' = 'free';
      if (user) {
        try {
          const supabase = (await import('../lib/supabase')).createBrowserClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single();
          
          if (profile?.subscription_tier && ['premium', 'unlimited'].includes(profile.subscription_tier)) {
            userTier = profile.subscription_tier as 'premium' | 'unlimited';
          }
        } catch (error) {
          console.warn('Could not fetch user tier, defaulting to free:', error);
        }
      }

      // Validate audio file with user tier
      const validation = audioUploadService.validateAudioFile(file, userTier);
    
      // Check file extension as fallback if MIME type validation fails
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const validExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac', 'mp4'];
      const hasValidExtension = fileExtension && validExtensions.includes(fileExtension);
      
      // Check if error is file size related - block upload if file size exceeds limit
      const fileSizeError = validation.errors.find(err => err.includes('exceeds your') || err.includes('File size'));
      
      if (fileSizeError) {
        // File size exceeds limit - block upload and show clear error
        setState(prev => ({
          ...prev,
          error: fileSizeError,
          uploadStatus: 'error',
          audioFile: null
        }));
        console.error('❌ File validation failed - file size exceeds limit:', fileSizeError);
        return;
      }

      // If validation fails but has valid extension, allow it (some browsers don't set MIME types correctly)
      if (!validation.isValid && !hasValidExtension) {
        setState(prev => ({
          ...prev,
          error: validation.errors.join(', '),
          uploadStatus: 'error',
          audioFile: null
        }));
        console.error('❌ File validation failed:', validation.errors);
        return;
      }

      // If validation failed but has valid extension, log a warning but proceed
      if (!validation.isValid && hasValidExtension) {
        console.warn('⚠️ MIME type validation failed but file extension is valid. Proceeding with upload:', {
          fileName: file.name,
          fileType: file.type,
          extension: fileExtension,
          validationErrors: validation.errors
        });
      }

      const uploadFile: UploadFile = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || `audio/${fileExtension}`, // Fallback to extension-based type
        progress: 0,
        status: 'pending'
      };

      setState(prev => ({
        ...prev,
        audioFile: uploadFile,
        error: validation.isValid ? null : validation.errors.length > 0 ? validation.errors.join(', ') : null,
        uploadStatus: 'idle'
      }));
      
      console.log('✅ Audio file set successfully:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || `audio/${fileExtension}`,
        fileId: uploadFile.id
      });
    };

    // Execute validation asynchronously
    validateFile();
  }, [user]);

  const setCoverArtFile = useCallback((file: File | null) => {
    if (!file) {
      setState(prev => ({ ...prev, coverArtFile: null }));
      return;
    }

    // Validate image file
    const validation = audioUploadService.validateImageFile(file);
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        error: validation.errors.join(', '),
        uploadStatus: 'error'
      }));
      return;
    }

    const uploadFile: UploadFile = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'pending'
    };

    setState(prev => ({
      ...prev,
      coverArtFile: uploadFile,
      error: null,
      uploadStatus: 'idle'
    }));
  }, []);

  const uploadTrack = useCallback(async (
    trackData: Omit<TrackUploadData, 'audioFile' | 'coverArtFile'>,
    qualitySettings?: AudioQualitySettings
  ): Promise<{ success: boolean; trackId?: string }> => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'You must be logged in to upload tracks',
        uploadStatus: 'error'
      }));
      return { success: false };
    }

    if (!state.audioFile) {
      setState(prev => ({
        ...prev,
        error: 'Please select an audio file to upload',
        uploadStatus: 'error'
      }));
      return { success: false };
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isUploading: true,
      uploadStatus: 'uploading',
      error: null,
      successMessage: null,
      uploadProgress: { audio: 0, cover: 0, processing: 0 }
    }));

    try {
      const completeTrackData: TrackUploadData = {
        ...trackData,
        audioFile: state.audioFile,
        coverArtFile: state.coverArtFile || undefined
      };

      const result = await audioUploadService.uploadTrack(
        completeTrackData,
        user.id,
        qualitySettings,
        (type, progress) => {
          setState(prev => ({
            ...prev,
            uploadProgress: {
              ...prev.uploadProgress,
              [type]: progress.progress || progress.percentage || 0
            }
          }));
        }
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'success',
          successMessage: 'Track uploaded successfully!',
          uploadProgress: { audio: 100, cover: 100, processing: 100 }
        }));
        return { success: true, trackId: result.trackId };
      } else {
        setState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'error',
          error: result.error?.message || 'Upload failed'
        }));
        return { success: false };
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadStatus: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      return { success: false };
    }
  }, [user, state.audioFile, state.coverArtFile]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isUploading: false,
      uploadStatus: 'idle',
      uploadProgress: { audio: 0, cover: 0, processing: 0 }
    }));
  }, []);

  const resetUpload = useCallback(() => {
    setState({
      audioFile: null,
      coverArtFile: null,
      isUploading: false,
      uploadProgress: {
        audio: 0,
        cover: 0,
        processing: 0
      },
      uploadStatus: 'idle',
      error: null,
      successMessage: null
    });
  }, []);

  const validateFiles = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!user) {
      errors.push('You must be logged in to upload tracks');
    }

    if (!state.audioFile) {
      errors.push('Please select an audio file to upload');
    }

    if (state.audioFile) {
      const validation = audioUploadService.validateAudioFile(state.audioFile.file);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    if (state.coverArtFile) {
      const validation = audioUploadService.validateImageFile(state.coverArtFile.file);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [user, state.audioFile, state.coverArtFile]);

  return [
    state,
    {
      setAudioFile,
      setCoverArtFile,
      uploadTrack,
      cancelUpload,
      resetUpload,
      validateFiles
    }
  ];
} 