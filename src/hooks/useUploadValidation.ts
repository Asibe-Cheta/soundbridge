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

  // Check if file size is too large for base64 transmission
  const isFileTooLarge = useCallback((file: File): boolean => {
    // Base64 increases size by ~33%, so we limit to 25MB original size for 33MB base64
    const MAX_BASE64_SIZE = 25 * 1024 * 1024; // 25MB
    return file.size > MAX_BASE64_SIZE;
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
      
      // For large files, only send file info instead of full file data
      const requestBody: any = {
        metadata,
        config
      };

      if (isFileTooLarge(file)) {
        // For large files, only send file info
        requestBody.fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type
        };
        
        setProgress({
          stage: 'validation',
          progress: 20,
          message: 'Validating file info (large file mode)...',
          canCancel: true
        });
      } else {
        // For smaller files, send full file data
        const fileData = await fileToBase64(file);
        requestBody.fileData = fileData;
        
        setProgress({
          stage: 'validation',
          progress: 20,
          message: 'Sending to validation service...',
          canCancel: true
        });
      }

      // Call validation API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/upload/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Validation failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || 'Validation failed';
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.details || 'Validation failed');
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
      let errorMessage = 'Validation failed';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Validation timed out. Please try again with a smaller file or check your connection.';
        } else if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
          errorMessage = 'Network error occurred during validation. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
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
