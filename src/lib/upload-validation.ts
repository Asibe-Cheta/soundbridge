// Upload Validation Service for SoundBridge
// Comprehensive validation system with tier-based limits and metadata checks

import { 
  UploadValidationRules,
  UploadValidationResult,
  UploadValidationError,
  UploadValidationWarning,
  FileValidationMetadata,
  AppliedValidationRules,
  UploadTierRules,
  UploadValidationRequest,
  UploadValidationResponse,
  UploadProgress,
  VALIDATION_ERROR_CODES,
  VALIDATION_CONSTANTS,
  ValidationErrorCode
} from './types/upload-validation';

// Audio metadata extraction utility
async function extractAudioMetadata(file: File): Promise<Partial<FileValidationMetadata>> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      resolve({
        duration: audio.duration,
        size: file.size,
        type: file.type,
        format: file.type.split('/')[1]?.toUpperCase()
      });
      URL.revokeObjectURL(url);
    });
    
    audio.addEventListener('error', () => {
      resolve({
        size: file.size,
        type: file.type,
        format: file.type.split('/')[1]?.toUpperCase()
      });
      URL.revokeObjectURL(url);
    });
    
    audio.src = url;
  });
}

// Validation rules configuration
const VALIDATION_RULES: UploadValidationRules = {
  universal: {
    fileSize: {
      max: VALIDATION_CONSTANTS.FILE_SIZES.FREE_MAX, // Default to free tier
      min: VALIDATION_CONSTANTS.FILE_SIZES.MIN
    },
    formats: VALIDATION_CONSTANTS.ALLOWED_FORMATS,
    duration: {
      max: VALIDATION_CONSTANTS.DURATION.MAX,
      min: VALIDATION_CONSTANTS.DURATION.MIN
    },
    metadata: {
      required: VALIDATION_CONSTANTS.REQUIRED_METADATA,
      optional: ['description', 'tags', 'privacy', 'publishOption']
    }
  },
  
  tierBased: {
    free: {
      fileSize: { max: VALIDATION_CONSTANTS.FILE_SIZES.FREE_MAX },
      processing: 'standard',
      copyrightCheck: 'basic',
      moderation: 'automated',
      quality: 'standard',
      concurrentUploads: VALIDATION_CONSTANTS.CONCURRENT_UPLOADS.FREE,
      dailyUploadLimit: VALIDATION_CONSTANTS.DAILY_LIMITS.FREE
    },
    pro: {
      fileSize: { max: VALIDATION_CONSTANTS.FILE_SIZES.PRO_MAX },
      processing: 'priority',
      copyrightCheck: 'advanced',
      moderation: 'priority',
      quality: 'hd',
      concurrentUploads: VALIDATION_CONSTANTS.CONCURRENT_UPLOADS.PRO,
      dailyUploadLimit: VALIDATION_CONSTANTS.DAILY_LIMITS.PRO
    },
    enterprise: {
      fileSize: { max: VALIDATION_CONSTANTS.FILE_SIZES.ENTERPRISE_MAX },
      processing: 'instant',
      copyrightCheck: 'ai-powered',
      moderation: 'human-ai',
      quality: 'lossless',
      concurrentUploads: VALIDATION_CONSTANTS.CONCURRENT_UPLOADS.ENTERPRISE,
      dailyUploadLimit: VALIDATION_CONSTANTS.DAILY_LIMITS.ENTERPRISE
    }
  }
};

// Error message templates
const ERROR_MESSAGES: Record<ValidationErrorCode, string> = {
  [VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED]: 'File size exceeds the limit for your subscription tier',
  [VALIDATION_ERROR_CODES.FILE_SIZE_TOO_SMALL]: 'File size is too small (minimum 1MB required)',
  [VALIDATION_ERROR_CODES.INVALID_FILE_TYPE]: 'File type is not supported',
  [VALIDATION_ERROR_CODES.DURATION_EXCEEDED]: 'Audio duration exceeds the maximum limit (3 hours)',
  [VALIDATION_ERROR_CODES.DURATION_TOO_SHORT]: 'Audio duration is too short (minimum 10 seconds)',
  [VALIDATION_ERROR_CODES.MISSING_REQUIRED_METADATA]: 'Required metadata fields are missing',
  [VALIDATION_ERROR_CODES.INVALID_METADATA_FORMAT]: 'Metadata format is invalid',
  [VALIDATION_ERROR_CODES.COPYRIGHT_VIOLATION]: 'Potential copyright violation detected',
  [VALIDATION_ERROR_CODES.CONTENT_POLICY_VIOLATION]: 'Content violates community guidelines',
  [VALIDATION_ERROR_CODES.DAILY_LIMIT_EXCEEDED]: 'Daily upload limit exceeded',
  [VALIDATION_ERROR_CODES.CONCURRENT_UPLOAD_LIMIT]: 'Too many concurrent uploads',
  [VALIDATION_ERROR_CODES.FILE_CORRUPTED]: 'File appears to be corrupted or invalid',
  [VALIDATION_ERROR_CODES.NETWORK_ERROR]: 'Network error occurred during validation',
  [VALIDATION_ERROR_CODES.SERVER_ERROR]: 'Server error occurred during validation',
  [VALIDATION_ERROR_CODES.AUTHENTICATION_REQUIRED]: 'Authentication required for upload',
  [VALIDATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for upload'
};

// Suggestion templates
const SUGGESTIONS: Record<ValidationErrorCode, string> = {
  [VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED]: 'Consider upgrading to Pro or Enterprise for larger file uploads',
  [VALIDATION_ERROR_CODES.FILE_SIZE_TOO_SMALL]: 'Ensure your audio file is at least 1MB in size',
  [VALIDATION_ERROR_CODES.INVALID_FILE_TYPE]: 'Convert your file to MP3, WAV, M4A, AAC, OGG, or FLAC format',
  [VALIDATION_ERROR_CODES.DURATION_EXCEEDED]: 'Split your audio into smaller segments or consider upgrading for longer content',
  [VALIDATION_ERROR_CODES.DURATION_TOO_SHORT]: 'Ensure your audio is at least 10 seconds long',
  [VALIDATION_ERROR_CODES.MISSING_REQUIRED_METADATA]: 'Please provide a title and select a genre for your track',
  [VALIDATION_ERROR_CODES.INVALID_METADATA_FORMAT]: 'Check that all metadata fields are properly formatted',
  [VALIDATION_ERROR_CODES.COPYRIGHT_VIOLATION]: 'Ensure you have rights to upload this content',
  [VALIDATION_ERROR_CODES.CONTENT_POLICY_VIOLATION]: 'Review our community guidelines and modify your content',
  [VALIDATION_ERROR_CODES.DAILY_LIMIT_EXCEEDED]: 'Wait until tomorrow or upgrade for unlimited uploads',
  [VALIDATION_ERROR_CODES.CONCURRENT_UPLOAD_LIMIT]: 'Wait for current uploads to complete or upgrade for more concurrent uploads',
  [VALIDATION_ERROR_CODES.FILE_CORRUPTED]: 'Try re-exporting your audio file or use a different file',
  [VALIDATION_ERROR_CODES.NETWORK_ERROR]: 'Check your internet connection and try again',
  [VALIDATION_ERROR_CODES.SERVER_ERROR]: 'Please try again later or contact support',
  [VALIDATION_ERROR_CODES.AUTHENTICATION_REQUIRED]: 'Please log in to upload content',
  [VALIDATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Contact support to upgrade your account permissions'
};

// Core validation functions
export class UploadValidationService {
  
  /**
   * Validate file size against tier-based limits
   */
  private validateFileSize(
    file: File, 
    tier: keyof UploadValidationRules['tierBased']
  ): UploadValidationError | null {
    const tierRules = VALIDATION_RULES.tierBased[tier];
    const maxSize = tierRules.fileSize.max;
    
    if (file.size > maxSize) {
      return {
        code: VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED,
        message: ERROR_MESSAGES[VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED],
        severity: 'error',
        suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED]
      };
    }
    
    if (file.size < VALIDATION_CONSTANTS.FILE_SIZES.MIN) {
      return {
        code: VALIDATION_ERROR_CODES.FILE_SIZE_TOO_SMALL,
        message: ERROR_MESSAGES[VALIDATION_ERROR_CODES.FILE_SIZE_TOO_SMALL],
        severity: 'error',
        suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.FILE_SIZE_TOO_SMALL]
      };
    }
    
    return null;
  }
  
  /**
   * Validate file type against allowed formats
   */
  private validateFileType(file: File): UploadValidationError | null {
    const allowedTypes = VALIDATION_RULES.universal.formats;
    
    if (!allowedTypes.includes(file.type)) {
      return {
        code: VALIDATION_ERROR_CODES.INVALID_FILE_TYPE,
        message: ERROR_MESSAGES[VALIDATION_ERROR_CODES.INVALID_FILE_TYPE],
        severity: 'error',
        suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.INVALID_FILE_TYPE]
      };
    }
    
    return null;
  }
  
  /**
   * Validate audio duration
   */
  private validateDuration(
    duration: number, 
    tier: keyof UploadValidationRules['tierBased']
  ): UploadValidationError | null {
    const { min, max } = VALIDATION_RULES.universal.duration;
    
    if (duration > max) {
      return {
        code: VALIDATION_ERROR_CODES.DURATION_EXCEEDED,
        message: ERROR_MESSAGES[VALIDATION_ERROR_CODES.DURATION_EXCEEDED],
        severity: 'error',
        suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.DURATION_EXCEEDED]
      };
    }
    
    if (duration < min) {
      return {
        code: VALIDATION_ERROR_CODES.DURATION_TOO_SHORT,
        message: ERROR_MESSAGES[VALIDATION_ERROR_CODES.DURATION_TOO_SHORT],
        severity: 'error',
        suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.DURATION_TOO_SHORT]
      };
    }
    
    return null;
  }
  
  /**
   * Validate metadata requirements
   */
  private validateMetadata(
    metadata: UploadValidationRequest['metadata'],
    tier: keyof UploadValidationRules['tierBased']
  ): UploadValidationError[] {
    const errors: UploadValidationError[] = [];
    const required = VALIDATION_RULES.universal.metadata.required;
    
    for (const field of required) {
      if (!metadata[field as keyof typeof metadata] || 
          String(metadata[field as keyof typeof metadata]).trim() === '') {
        errors.push({
          code: VALIDATION_ERROR_CODES.MISSING_REQUIRED_METADATA,
          message: `${field} is required`,
          field,
          severity: 'error',
          suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.MISSING_REQUIRED_METADATA]
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Get applied validation rules for transparency
   */
  private getAppliedRules(
    file: File,
    metadata: UploadValidationRequest['metadata'],
    tier: keyof UploadValidationRules['tierBased'],
    audioMetadata?: Partial<FileValidationMetadata>
  ): AppliedValidationRules {
    const tierRules = VALIDATION_RULES.tierBased[tier];
    
    return {
      fileSize: {
        limit: tierRules.fileSize.max,
        actual: file.size,
        tier
      },
      format: {
        allowed: VALIDATION_RULES.universal.formats,
        actual: file.type,
        valid: VALIDATION_RULES.universal.formats.includes(file.type)
      },
      duration: audioMetadata?.duration ? {
        limit: VALIDATION_RULES.universal.duration.max,
        actual: audioMetadata.duration,
        valid: audioMetadata.duration >= VALIDATION_RULES.universal.duration.min &&
               audioMetadata.duration <= VALIDATION_RULES.universal.duration.max
      } : undefined,
      metadata: {
        required: VALIDATION_RULES.universal.metadata.required,
        provided: Object.keys(metadata).filter(key => 
          metadata[key as keyof typeof metadata] && 
          String(metadata[key as keyof typeof metadata]).trim() !== ''
        ),
        missing: VALIDATION_RULES.universal.metadata.required.filter(field => 
          !metadata[field as keyof typeof metadata] || 
          String(metadata[field as keyof typeof metadata]).trim() === ''
        )
      }
    };
  }
  
  /**
   * Main validation function
   */
  async validateUpload(request: UploadValidationRequest): Promise<UploadValidationResponse> {
    const { file, metadata, userTier, config } = request;
    const errors: UploadValidationError[] = [];
    const warnings: UploadValidationWarning[] = [];
    
    // Progress tracking
    const progress: UploadProgress = {
      stage: 'validation',
      progress: 0,
      message: 'Starting validation...',
      canCancel: true
    };
    
    try {
      // Step 1: File size validation
      progress.progress = 20;
      progress.message = 'Validating file size...';
      
      const sizeError = this.validateFileSize(file, userTier);
      if (sizeError) errors.push(sizeError);
      
      // Step 2: File type validation
      progress.progress = 40;
      progress.message = 'Validating file type...';
      
      const typeError = this.validateFileType(file);
      if (typeError) errors.push(typeError);
      
      // Step 3: Extract audio metadata
      progress.progress = 60;
      progress.message = 'Analyzing audio file...';
      
      const audioMetadata = await extractAudioMetadata(file);
      
      // Step 4: Duration validation
      if (audioMetadata.duration) {
        progress.progress = 80;
        progress.message = 'Validating audio duration...';
        
        const durationError = this.validateDuration(audioMetadata.duration, userTier);
        if (durationError) errors.push(durationError);
      }
      
      // Step 5: Metadata validation
      progress.progress = 90;
      progress.message = 'Validating metadata...';
      
      const metadataErrors = this.validateMetadata(metadata, userTier);
      errors.push(...metadataErrors);
      
      // Step 6: Complete validation
      progress.progress = 100;
      progress.message = 'Validation complete';
      progress.canCancel = false;
      
      const isValid = errors.length === 0;
      const appliedRules = this.getAppliedRules(file, metadata, userTier, audioMetadata);
      
      const result: UploadValidationResult = {
        isValid,
        errors,
        warnings,
        metadata: audioMetadata,
        tier: userTier,
        appliedRules
      };
      
      // Determine if upgrade prompt should be shown
      const upgradePrompt = this.shouldShowUpgradePrompt(errors, userTier);
      
      return {
        success: isValid,
        result,
        progress,
        upgradePrompt
      };
      
    } catch (error) {
      console.error('Upload validation error:', error);
      
      return {
        success: false,
        result: {
          isValid: false,
          errors: [{
            code: VALIDATION_ERROR_CODES.SERVER_ERROR,
            message: ERROR_MESSAGES[VALIDATION_ERROR_CODES.SERVER_ERROR],
            severity: 'error',
            suggestion: SUGGESTIONS[VALIDATION_ERROR_CODES.SERVER_ERROR]
          }],
          warnings: [],
          tier: userTier,
          appliedRules: this.getAppliedRules(file, metadata, userTier)
        },
        progress: {
          stage: 'validation',
          progress: 0,
          message: 'Validation failed',
          canCancel: false
        }
      };
    }
  }
  
  /**
   * Determine if upgrade prompt should be shown
   */
  private shouldShowUpgradePrompt(
    errors: UploadValidationError[], 
    currentTier: string
  ): UploadValidationResponse['upgradePrompt'] {
    if (currentTier !== 'free') return { show: false, reason: '', benefits: [], cta: '' };
    
    const upgradeReasons = errors.filter(error => 
      error.code === VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED ||
      error.code === VALIDATION_ERROR_CODES.DURATION_EXCEEDED
    );
    
    if (upgradeReasons.length > 0) {
      return {
        show: true,
        reason: 'Your file exceeds the limits for the free tier',
        benefits: [
          'Upload files up to 500MB (Pro) or 2GB (Enterprise)',
          'Priority processing and advanced copyright protection',
          'HD audio quality and instant processing',
          'Unlimited concurrent uploads'
        ],
        cta: 'Upgrade Now'
      };
    }
    
    return { show: false, reason: '', benefits: [], cta: '' };
  }
  
  /**
   * Get tier-based upload limits for display
   */
  static getTierLimits(tier: keyof UploadValidationRules['tierBased']): UploadTierRules {
    return VALIDATION_RULES.tierBased[tier];
  }
  
  /**
   * Get all validation rules for debugging
   */
  static getValidationRules(): UploadValidationRules {
    return VALIDATION_RULES;
  }
}

// Export singleton instance
export const uploadValidationService = new UploadValidationService();
