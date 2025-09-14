import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { 
  UploadValidationRequest,
  UploadValidationResponse,
  UploadValidationResult,
  UploadProgress,
  UploadValidationConfig
} from '../lib/types/upload-validation';

export interface UseUploadValidationReturn {
  // State
  isValidating: boolean;
  validationResult: UploadValidationResult | null;
  progress: UploadProgress | null;
  error: string | null;
  
  // Actions
  validateFile: (file: File, metadata: UploadValidationRequest['metadata'], config?: UploadValidationConfig) => Promise<UploadValidationResponse | null>;
  clearValidation: () => void;
  getTierLimits: () => Promise<any>;
}

export function useUploadValidation(): UseUploadValidationReturn {
  const { user } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<UploadValidationResult | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convert File to base64 for API transmission
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  // Main validation function
  const validateFile = useCallback(async (
    file: File, 
    metadata: UploadValidationRequest['metadata'],
    config: UploadValidationConfig = {
      enableCopyrightCheck: false,
      enableContentModeration: false,
      enableCommunityGuidelines: true,
      enableMetadataValidation: true,
      enableFileIntegrityCheck: true,
      strictMode: false
    }
  ): Promise<UploadValidationResponse | null> => {
    if (!user) {
      setError('Authentication required');
      return null;
    }

    setIsValidating(true);
    setError(null);
    setValidationResult(null);
    setProgress({
      stage: 'validation',
      progress: 0,
      message: 'Preparing validation...',
      canCancel: true
    });

    try {
      console.log('🔍 Starting file validation:', file.name, 'Size:', file.size);
      
      // Convert file to base64
      setProgress({
        stage: 'validation',
        progress: 10,
        message: 'Processing file...',
        canCancel: true
      });
      
      const fileData = await fileToBase64(file);
      
      setProgress({
        stage: 'validation',
        progress: 20,
        message: 'Sending to validation service...',
        canCancel: true
      });

      // Call validation API
      const response = await fetch('/api/upload/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          metadata,
          config
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Validation failed');
      }

      const validationResponse: UploadValidationResponse = result.data;
      
      // Update state with results
      setValidationResult(validationResponse.result);
      setProgress(validationResponse.progress);
      
      console.log('✅ Validation complete:', {
        isValid: validationResponse.result.isValid,
        errors: validationResponse.result.errors.length,
        warnings: validationResponse.result.warnings.length
      });

      return validationResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      console.error('❌ Validation error:', errorMessage);
      
      setError(errorMessage);
      setProgress({
        stage: 'validation',
        progress: 0,
        message: 'Validation failed',
        canCancel: false
      });
      
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [user, fileToBase64]);

  // Clear validation state
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setProgress(null);
    setError(null);
    setIsValidating(false);
  }, []);

  // Get tier limits for current user
  const getTierLimits = useCallback(async () => {
    if (!user) return null;

    try {
      const response = await fetch('/api/upload/validate', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get tier limits');
      }

      const result = await response.json();
      return result.data;

    } catch (err) {
      console.error('❌ Error getting tier limits:', err);
      return null;
    }
  }, [user]);

  return {
    // State
    isValidating,
    validationResult,
    progress,
    error,
    
    // Actions
    validateFile,
    clearValidation,
    getTierLimits
  };
}
