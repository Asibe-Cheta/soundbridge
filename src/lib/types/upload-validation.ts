// Upload Validation Types for SoundBridge
// Enhanced validation system with tier-based limits and comprehensive checks

export interface UploadValidationRules {
  // Universal rules (apply to all users)
  universal: {
    fileSize: {
      max: number; // in bytes
      min: number; // in bytes
    };
    formats: string[]; // allowed MIME types
    duration: {
      max: number; // in seconds
      min: number; // in seconds
    };
    metadata: {
      required: string[]; // required fields
      optional: string[]; // optional fields
    };
  };
  
  // Tier-based rules (vary by subscription)
  tierBased: {
    free: UploadTierRules;
    pro: UploadTierRules;
    enterprise: UploadTierRules;
  };
}

export interface UploadTierRules {
  fileSize: {
    max: number; // in bytes
  };
  processing: 'standard' | 'priority' | 'instant';
  copyrightCheck: 'basic' | 'advanced' | 'ai-powered';
  moderation: 'automated' | 'priority' | 'human-ai';
  quality: 'standard' | 'hd' | 'lossless';
  concurrentUploads: number;
  dailyUploadLimit?: number; // undefined = unlimited
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: UploadValidationError[];
  warnings: UploadValidationWarning[];
  metadata?: FileValidationMetadata;
  tier: 'free' | 'pro' | 'enterprise';
  appliedRules: AppliedValidationRules;
}

export interface UploadValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface UploadValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface FileValidationMetadata {
  size: number;
  type: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  width?: number;
  height?: number;
}

export interface AppliedValidationRules {
  fileSize: {
    limit: number;
    actual: number;
    tier: string;
  };
  format: {
    allowed: string[];
    actual: string;
    valid: boolean;
  };
  duration?: {
    limit: number;
    actual: number;
    valid: boolean;
  };
  metadata: {
    required: string[];
    provided: string[];
    missing: string[];
  };
}

export interface UploadValidationConfig {
  enableCopyrightCheck: boolean;
  enableContentModeration: boolean;
  enableCommunityGuidelines: boolean;
  enableMetadataValidation: boolean;
  enableFileIntegrityCheck: boolean;
  strictMode: boolean; // for enterprise users
}

export interface UploadProgress {
  stage: 'validation' | 'copyright-check' | 'moderation' | 'upload' | 'processing' | 'complete';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
  canCancel: boolean;
}

export interface UploadValidationRequest {
  file: File;
  metadata: {
    title?: string;
    description?: string;
    genre?: string;
    tags?: string[];
    privacy?: 'public' | 'followers' | 'private';
    publishOption?: 'now' | 'schedule' | 'draft';
    scheduleDate?: string;
  };
  userId: string;
  userTier: 'free' | 'pro' | 'enterprise';
  config: UploadValidationConfig;
}

export interface UploadValidationResponse {
  success: boolean;
  result: UploadValidationResult;
  progress: UploadProgress;
  nextSteps?: string[];
  upgradePrompt?: {
    show: boolean;
    reason: string;
    benefits: string[];
    cta: string;
  };
}

// Validation error codes
export const VALIDATION_ERROR_CODES = {
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  FILE_SIZE_TOO_SMALL: 'FILE_SIZE_TOO_SMALL',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DURATION_EXCEEDED: 'DURATION_EXCEEDED',
  DURATION_TOO_SHORT: 'DURATION_TOO_SHORT',
  MISSING_REQUIRED_METADATA: 'MISSING_REQUIRED_METADATA',
  INVALID_METADATA_FORMAT: 'INVALID_METADATA_FORMAT',
  COPYRIGHT_VIOLATION: 'COPYRIGHT_VIOLATION',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  CONCURRENT_UPLOAD_LIMIT: 'CONCURRENT_UPLOAD_LIMIT',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS'
} as const;

export type ValidationErrorCode = typeof VALIDATION_ERROR_CODES[keyof typeof VALIDATION_ERROR_CODES];

// Validation constants
export const VALIDATION_CONSTANTS = {
  // File size limits (in bytes)
  FILE_SIZES: {
    FREE_MAX: 100 * 1024 * 1024, // 100MB
    PRO_MAX: 500 * 1024 * 1024, // 500MB
    ENTERPRISE_MAX: 2 * 1024 * 1024 * 1024, // 2GB
    MIN: 1024 * 1024, // 1MB
  },
  
  // Duration limits (in seconds)
  DURATION: {
    MAX: 3 * 60 * 60, // 3 hours
    MIN: 10, // 10 seconds
  },
  
  // Allowed formats
  ALLOWED_FORMATS: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/flac'
  ],
  
  // Required metadata fields
  REQUIRED_METADATA: ['title', 'genre'],
  
  // Processing time estimates (in seconds)
  PROCESSING_TIME: {
    STANDARD: 120, // 2 minutes
    PRIORITY: 60, // 1 minute
    INSTANT: 30, // 30 seconds
  },
  
  // Concurrent upload limits
  CONCURRENT_UPLOADS: {
    FREE: 1,
    PRO: 3,
    ENTERPRISE: 5,
  },
  
  // Daily upload limits (undefined = unlimited)
  DAILY_LIMITS: {
    FREE: undefined, // unlimited
    PRO: undefined, // unlimited
    ENTERPRISE: undefined, // unlimited
  }
} as const;
