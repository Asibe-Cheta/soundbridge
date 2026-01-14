import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyzeAudioFile, formatDuration, getQualityDescription } from '../lib/audio-analysis';
import type { 
  UploadValidationRequest,
  UploadValidationResponse,
  UploadValidationResult,
  UploadProgress,
  UploadValidationConfig,
  UploadValidationError,
  UploadValidationWarning
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

  // Real audio analysis and validation function
  const validateFileWithRealAnalysis = useCallback(async (
    file: File, 
    metadata: UploadValidationRequest['metadata']
  ): Promise<UploadValidationResult> => {
    const errors: UploadValidationError[] = [];
    const warnings: UploadValidationWarning[] = [];
    
    console.log('🔍 Starting real audio analysis for:', file.name);
    
    // Step 1: Basic file validation - get user tier and limits
    const userTier = (user as any)?.subscription_tier || 'free';
    
    // File size limits by subscription tier (matching mobile app)
    const FILE_SIZE_LIMITS = {
      free: 50 * 1024 * 1024,      // 50MB
      premium: 200 * 1024 * 1024,   // 200MB
      unlimited: 500 * 1024 * 1024, // 500MB
    };
    
    const maxSize = FILE_SIZE_LIMITS[userTier as keyof typeof FILE_SIZE_LIMITS] || FILE_SIZE_LIMITS.free;
    
    if (file.size > maxSize) {
      const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const upgradeTier = userTier === 'free' ? 'Premium' : userTier === 'premium' ? 'Unlimited' : null;
      const upgradeLimit = userTier === 'free' ? '200MB' : userTier === 'premium' ? '500MB' : null;
      
      errors.push({
        code: 'FILE_SIZE_EXCEEDED',
        message: `File size (${fileSizeMB}MB) exceeds your ${userTier} plan limit (${limitMB}MB).`,
        severity: 'error',
        suggestion: upgradeTier ? `Upgrade to ${upgradeTier} to upload files up to ${upgradeLimit}` : 'Please reduce file size or upgrade your plan'
      });
    }
    
    // Step 2: File type validation
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Please upload MP3, WAV, M4A, AAC, OGG, or FLAC files.',
        severity: 'error',
        suggestion: 'Convert your file to a supported audio format'
      });
    }
    
    // Step 3: Metadata validation
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

    // Step 4: Real audio analysis (only if basic validations pass)
    let audioAnalysis = null;
    if (errors.length === 0) {
      try {
        console.log('🎵 Attempting to analyze audio file:', file.name);
        audioAnalysis = await analyzeAudioFile(file);
        console.log('🎵 Audio analysis result:', audioAnalysis);
        
        if (!audioAnalysis.success) {
          console.log('❌ Audio analysis failed:', audioAnalysis.error);
          errors.push({
            code: 'FILE_CORRUPTED',
            message: `Audio file analysis failed: ${audioAnalysis.error}`,
            severity: 'error',
            suggestion: 'The file may be corrupted or in an unsupported format. Try converting to MP3 or WAV format.'
          });
        } else if (!audioAnalysis.isValidAudio) {
          console.log('❌ Audio file is invalid');
          errors.push({
            code: 'INVALID_AUDIO_FILE',
            message: 'Invalid audio file - missing required audio properties',
            severity: 'error',
            suggestion: 'Ensure the file is a valid audio file with proper audio data'
          });
        } else {
          console.log('✅ Audio analysis successful');
          // Add audio quality warnings
          if (audioAnalysis.quality === 'low') {
            warnings.push({
              code: 'LOW_AUDIO_QUALITY',
              message: `Audio quality is low (${audioAnalysis.bitrate}kbps)`,
              suggestion: 'Consider using a higher bitrate for better audio quality'
            });
          }

          // Add duration information
          if (audioAnalysis.duration > 0) {
            console.log(`✅ Audio analysis successful: ${formatDuration(audioAnalysis.duration)}, ${audioAnalysis.bitrate}kbps, ${getQualityDescription(audioAnalysis.quality)}`);
          }
        }
      } catch (error) {
        console.error('❌ Audio analysis threw exception:', error);
        errors.push({
          code: 'AUDIO_ANALYSIS_FAILED',
          message: `Failed to analyze audio file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          suggestion: 'Please try uploading a different audio file or convert to MP3/WAV format'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: audioAnalysis?.metadata || {
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
        duration: audioAnalysis ? {
          limit: 3 * 60 * 60, // 3 hours for free tier
          actual: audioAnalysis.duration,
          valid: audioAnalysis.duration <= 3 * 60 * 60
        } : undefined,
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
      console.log('🔍 Starting real audio file validation:', file.name, 'Size:', file.size);
      
      // Real validation steps with actual progress
      setProgress({
        stage: 'validation',
        progress: 10,
        message: 'Validating file size and type...',
        canCancel: true
      });
      
      setProgress({
        stage: 'validation',
        progress: 30,
        message: 'Validating metadata...',
        canCancel: true
      });
      
      setProgress({
        stage: 'validation',
        progress: 50,
        message: 'Analyzing audio file...',
        canCancel: true
      });
      
      // Perform real audio analysis
      const result = await validateFileWithRealAnalysis(file, metadata);
      
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
  }, [user, validateFileWithRealAnalysis]);

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
        fileSize: { max: 100 * 1024 * 1024 }, // 100MB
        processing: 'standard',
        copyrightCheck: 'basic',
        moderation: 'automated',
        quality: 'standard',
        concurrentUploads: 2,
        dailyUploadLimit: 10
      },
      rules: {
        universal: {
          fileSize: { max: 100 * 1024 * 1024, min: 1024 * 1024 },
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
