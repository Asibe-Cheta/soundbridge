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
  uploadTrack: (trackData: Omit<TrackUploadData, 'audioFile' | 'coverArtFile'>, qualitySettings?: AudioQualitySettings) => Promise<boolean>;
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

    // Validate audio file
    const validation = audioUploadService.validateAudioFile(file);
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
      audioFile: uploadFile,
      error: null,
      uploadStatus: 'idle'
    }));
  }, []);

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
  ): Promise<boolean> => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'You must be logged in to upload tracks',
        uploadStatus: 'error'
      }));
      return false;
    }

    if (!state.audioFile) {
      setState(prev => ({
        ...prev,
        error: 'Please select an audio file to upload',
        uploadStatus: 'error'
      }));
      return false;
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
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'error',
          error: result.error?.message || 'Upload failed'
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadStatus: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      return false;
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