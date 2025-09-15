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

  // Local validation function (no server calls)
  const validateFileLocally = useCallback((file: File, metadata: UploadValidationRequest['metadata']): UploadValidationResult => {
    const errors: UploadValidationError[] = [];
    const warnings: UploadValidationWarning[] = [];
    
    // File size validation (Free tier: 50MB, Pro: 200MB, Enterprise: 500MB)
    const maxSize = 50 * 1024 * 1024; // 50MB for free tier
    if (file.size > maxSize) {
      errors.push({
        code: 'FILE_SIZE_EXCEEDED',
        message: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the free tier limit of 50MB`,
        severity: 'error',
        suggestion: 'Upgrade to Pro or Enterprise for larger file uploads'
      });
    }
    
    // File type validation
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Please upload MP3, WAV, M4A, AAC, OGG, or FLAC files.',
        severity: 'error',
        suggestion: 'Convert your file to a supported audio format'
      });
    }
    
    // Metadata validation
    if (!metadata.title || metadata.title.trim() === '') {
      errors.push({
        code: 'MISSING_REQUIRED_METADATA',
        message: 'Title is required',
        field: 'title',
        severity: 'error',
        suggestion: 'Please provide a title for your track'
      });
    }
    
    if (!metadata.genre || metadata.genre.trim() === '') {
      errors.push({
        code: 'MISSING_REQUIRED_METADATA',
        message: 'Genre is required',
        field: 'genre',
        severity: 'error',
        suggestion: 'Please select a genre for your track'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        size: file.size,
        type: file.type,
        format: file.type.split('/')[1]?.toUpperCase()
      },
      tier: 'free',
      appliedRules: {
        fileSize: {
          limit: maxSize,
          actual: file.size,
          tier: 'free'
        },
        format: {
          allowed: allowedTypes,
          actual: file.type,
          valid: allowedTypes.includes(file.type)
        },
        metadata: {
          required: ['title', 'genre'],
          provided: Object.keys(metadata).filter(key => 
            metadata[key as keyof typeof metadata] && 
            String(metadata[key as keyof typeof metadata]).trim() !== ''
          ),
          missing: ['title', 'genre'].filter(field => 
            !metadata[field as keyof typeof metadata] || 
            String(metadata[field as keyof typeof metadata]).trim() === ''
          )
        }
      }
    };
  }, []);

  // Main validation function (now local only)
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
      message: 'Starting validation...',
      canCancel: true
    });

    try {
      console.log('🔍 Starting local file validation:', file.name, 'Size:', file.size);
      
      // Simulate validation steps with progress updates
      setProgress({
        stage: 'validation',
        progress: 20,
        message: 'Validating file size...',
        canCancel: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
      
      setProgress({
        stage: 'validation',
        progress: 50,
        message: 'Validating file type...',
        canCancel: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProgress({
        stage: 'validation',
        progress: 80,
        message: 'Validating metadata...',
        canCancel: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Perform local validation
      const result = validateFileLocally(file, metadata);
      
      setProgress({
        stage: 'validation',
        progress: 100,
        message: 'Validation complete',
        canCancel: false
      });
      
      // Update state with results
      setValidationResult(result);
      
      console.log('✅ Local validation complete:', {
        isValid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

      const validationResponse: UploadValidationResponse = {
        success: result.isValid,
        result,
        progress: {
          stage: 'validation',
          progress: 100,
          message: 'Validation complete',
          canCancel: false
        },
        upgradePrompt: result.errors.some(e => e.code === 'FILE_SIZE_EXCEEDED') ? {
          show: true,
          reason: 'Your file exceeds the free tier limits',
          benefits: [
            'Upload files up to 200MB (Pro) or 500MB (Enterprise)',
            'Priority processing and advanced features',
            'HD audio quality and instant processing'
          ],
          cta: 'Upgrade Now'
        } : { show: false, reason: '', benefits: [], cta: '' }
      };

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
  }, [user, validateFileLocally]);

  // Clear validation state
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setProgress(null);
    setError(null);
    setIsValidating(false);
  }, []);

  // Get tier limits for current user (local version)
  const getTierLimits = useCallback(async () => {
    if (!user) return null;

    // Return local tier limits (assuming free tier for now)
    return {
      tier: 'free',
      limits: {
        fileSize: { max: 50 * 1024 * 1024 }, // 50MB
        processing: 'standard',
        copyrightCheck: 'basic',
        moderation: 'automated',
        quality: 'standard',
        concurrentUploads: 2,
        dailyUploadLimit: 10
      },
      rules: {
        universal: {
          fileSize: { max: 50 * 1024 * 1024, min: 1024 * 1024 },
          formats: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'],
          duration: { max: 10800, min: 10 }, // 3 hours max, 10 seconds min
          metadata: { required: ['title', 'genre'], optional: ['description', 'tags', 'privacy', 'publishOption'] }
        }
      }
    };
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
