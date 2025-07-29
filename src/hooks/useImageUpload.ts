import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { imageUploadService } from '../lib/image-upload-service';
import type { UploadFile, UploadProgress } from '../lib/types/upload';

export interface ImageUploadState {
  imageFile: UploadFile | null;
  previewUrl: string | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
  successMessage: string | null;
  uploadedUrl: string | null;
}

export interface ImageUploadActions {
  setImageFile: (file: File | null) => void;
  uploadCoverArt: () => Promise<boolean>;
  uploadProfileImage: (type: 'avatar' | 'banner') => Promise<boolean>;
  uploadEventImage: () => Promise<boolean>;
  cancelUpload: () => void;
  resetUpload: () => void;
  validateImage: () => { isValid: boolean; errors: string[] };
}

export function useImageUpload(): [ImageUploadState, ImageUploadActions] {
  const { user } = useAuth();
  const [state, setState] = useState<ImageUploadState>({
    imageFile: null,
    previewUrl: null,
    isUploading: false,
    uploadProgress: 0,
    uploadStatus: 'idle',
    error: null,
    successMessage: null,
    uploadedUrl: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const setImageFile = useCallback((file: File | null) => {
    if (!file) {
      setState(prev => ({
        ...prev,
        imageFile: null,
        previewUrl: null,
        error: null,
        uploadStatus: 'idle'
      }));
      return;
    }

    // Validate image file
    const validation = imageUploadService.validateImageFile(file);
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

    // Create preview URL
    const previewUrl = imageUploadService.createPreviewUrl(file);

    setState(prev => ({
      ...prev,
      imageFile: uploadFile,
      previewUrl,
      error: null,
      uploadStatus: 'idle',
      uploadedUrl: null
    }));
  }, []);

  const uploadCoverArt = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'You must be logged in to upload images',
        uploadStatus: 'error'
      }));
      return false;
    }

    if (!state.imageFile) {
      setState(prev => ({
        ...prev,
        error: 'Please select an image file to upload',
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
      uploadProgress: 0
    }));

    try {
      const result = await imageUploadService.uploadCoverArt(
        state.imageFile.file,
        user.id,
        (progress) => {
          setState(prev => ({
            ...prev,
            uploadProgress: progress.percentage
          }));
        }
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'success',
          successMessage: 'Cover art uploaded successfully!',
          uploadProgress: 100,
          uploadedUrl: result.url
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
  }, [user, state.imageFile]);

  const uploadProfileImage = useCallback(async (type: 'avatar' | 'banner'): Promise<boolean> => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'You must be logged in to upload images',
        uploadStatus: 'error'
      }));
      return false;
    }

    if (!state.imageFile) {
      setState(prev => ({
        ...prev,
        error: 'Please select an image file to upload',
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
      uploadProgress: 0
    }));

    try {
      const result = await imageUploadService.uploadProfileImage(
        state.imageFile.file,
        user.id,
        type,
        (progress) => {
          setState(prev => ({
            ...prev,
            uploadProgress: progress.percentage
          }));
        }
      );

      if (result.success) {
        // Update profile with new image URL
        const updateResult = await imageUploadService.updateProfileImage(user.id, result.url!, type);

        if (updateResult.success) {
          setState(prev => ({
            ...prev,
            isUploading: false,
            uploadStatus: 'success',
            successMessage: `${type === 'avatar' ? 'Profile picture' : 'Banner'} updated successfully!`,
            uploadProgress: 100,
            uploadedUrl: result.url
          }));
          return true;
        } else {
          setState(prev => ({
            ...prev,
            isUploading: false,
            uploadStatus: 'error',
            error: 'Upload successful but failed to update profile'
          }));
          return false;
        }
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
  }, [user, state.imageFile]);

  const uploadEventImage = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'You must be logged in to upload images',
        uploadStatus: 'error'
      }));
      return false;
    }

    if (!state.imageFile) {
      setState(prev => ({
        ...prev,
        error: 'Please select an image file to upload',
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
      uploadProgress: 0
    }));

    try {
      const result = await imageUploadService.uploadEventImage(
        state.imageFile.file,
        user.id,
        (progress) => {
          setState(prev => ({
            ...prev,
            uploadProgress: progress.percentage
          }));
        }
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isUploading: false,
          uploadStatus: 'success',
          successMessage: 'Event image uploaded successfully!',
          uploadProgress: 100,
          uploadedUrl: result.url
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
  }, [user, state.imageFile]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isUploading: false,
      uploadStatus: 'idle',
      uploadProgress: 0
    }));
  }, []);

  const resetUpload = useCallback(() => {
    // Revoke preview URL if it exists
    if (state.previewUrl) {
      imageUploadService.revokePreviewUrl(state.previewUrl);
    }

    setState({
      imageFile: null,
      previewUrl: null,
      isUploading: false,
      uploadProgress: 0,
      uploadStatus: 'idle',
      error: null,
      successMessage: null,
      uploadedUrl: null
    });
  }, [state.previewUrl]);

  const validateImage = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!user) {
      errors.push('You must be logged in to upload images');
    }

    if (!state.imageFile) {
      errors.push('Please select an image file to upload');
    }

    if (state.imageFile) {
      const validation = imageUploadService.validateImageFile(state.imageFile.file);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [user, state.imageFile]);

  return [
    state,
    {
      setImageFile,
      uploadCoverArt,
      uploadProfileImage,
      uploadEventImage,
      cancelUpload,
      resetUpload,
      validateImage
    }
  ];
} 