export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  duration?: number;
  bitrate?: number;
  format?: string;
  sampleRate?: number;
  channels?: number;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
}

export interface AudioMetadata extends FileMetadata {
  duration: number;
  bitrate: number;
  format: string;
  sampleRate?: number;
  channels?: number;
}

export interface ImageMetadata extends FileMetadata {
  width: number;
  height: number;
  format: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  progress?: number;
  speed?: number;
  timeRemaining?: number;
  stage?: 'validation' | 'copyright-check' | 'moderation' | 'upload' | 'processing' | 'complete' | string;
  message?: string;
  canCancel?: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  metadata?: FileMetadata;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface BatchUploadResult {
  files: UploadFile[];
  successfulUploads: number;
  failedUploads: number;
  errors: any[];
  success: boolean;
  totalFiles: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AudioValidationResult extends FileValidationResult {
  duration?: number;
  bitrate?: number;
  warnings?: string[];
}

export interface ImageValidationResult extends FileValidationResult {
  width?: number;
  height?: number;
  warnings?: string[];
}

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  chunkSize?: number;
  retryAttempts?: number;
}

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

export interface TrackUploadData {
  title: string;
  description?: string;
  artistName?: string;
  album?: string;
  recordLabel?: string;
  genre?: string;
  tags?: string[];
  lyrics?: string;
  lyricsLanguage?: string;
  privacy: 'public' | 'followers' | 'private';
  publishOption: 'now' | 'schedule' | 'draft';
  scheduleDate?: string;
  audioFile: UploadFile;
  coverArtFile?: UploadFile;
}

// Copyright Protection Types
export interface CopyrightCheckResult {
  isViolation: boolean;
  confidence: number;
  matchedTrack?: {
    title: string;
    artist: string;
    rightsHolder?: string;
    releaseDate?: string;
  };
  violationType?: 'copyright_infringement' | 'trademark' | 'rights_holder_complaint';
  recommendation: 'approve' | 'flag' | 'block' | 'manual_review';
}

export interface CopyrightViolationReport {
  trackId: string;
  reporterId: string;
  violationType: 'copyright_infringement' | 'trademark' | 'rights_holder_complaint';
  description: string;
  evidenceUrls?: string[];
}

export interface DMCARequest {
  trackId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  rightsHolder: string;
  infringementDescription: string;
  originalWorkDescription: string;
  goodFaithStatement: boolean;
  accuracyStatement: boolean;
  authorityStatement: boolean;
  contactAddress?: string;
}

export interface CopyrightSettings {
  enableAutomatedChecking: boolean;
  confidenceThreshold: number;
  enableCommunityReporting: boolean;
  enableDMCARequests: boolean;
  autoFlagThreshold: number;
  autoBlockThreshold: number;
  requireManualReview: boolean;
  whitelistEnabled: boolean;
  blacklistEnabled: boolean;
}

export interface AudioFingerprint {
  hash: string;
  algorithm: string;
  confidence: number;
  metadata: {
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
  };
} 