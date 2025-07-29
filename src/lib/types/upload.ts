export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
  error?: string;
  url?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  duration?: number; // for audio files
  bitrate?: number;
  format?: string;
  width?: number; // for images
  height?: number;
  size?: number;
  mimeType?: string;
}

export interface AudioMetadata extends FileMetadata {
  duration: number;
  bitrate: number;
  format: string;
  waveform?: number[]; // waveform data for visualization
  sampleRate?: number;
  channels?: number;
}

export interface ImageMetadata extends FileMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

export interface UploadQueue {
  id: string;
  files: UploadFile[];
  status: 'idle' | 'uploading' | 'completed' | 'error';
  createdAt: Date;
  completedAt?: Date;
}

export interface TrackUploadData {
  title: string;
  description?: string;
  genre?: string;
  tags?: string[];
  coverArtUrl?: string;
  privacy: 'public' | 'followers' | 'private';
  publishOption: 'now' | 'schedule' | 'draft';
  scheduleDate?: string;
  audioFile: UploadFile;
  coverArtFile?: UploadFile;
}

export interface EventUploadData {
  title: string;
  description?: string;
  genre?: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  price?: string;
  maxAttendees?: number;
  privacy: 'public' | 'followers' | 'private';
  publishOption: 'now' | 'schedule' | 'draft';
  scheduleDate?: string;
  eventImage?: UploadFile;
}

export interface ProfileImageUploadData {
  type: 'avatar' | 'banner';
  file: UploadFile;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface UploadConfig {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  maxFiles?: number;
  autoUpload?: boolean;
  chunkSize?: number; // for large file uploads
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
}

export interface UploadError {
  code: string;
  message: string;
  details?: any;
}

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

export interface UploadResult {
  success: boolean;
  file?: UploadFile;
  error?: UploadError;
  url?: string;
  metadata?: FileMetadata;
}

export interface BatchUploadResult {
  success: boolean;
  files: UploadFile[];
  errors: UploadError[];
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
}

// Upload validation types
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AudioValidationResult extends FileValidationResult {
  duration?: number;
  bitrate?: number;
  format?: string;
}

export interface ImageValidationResult extends FileValidationResult {
  width?: number;
  height?: number;
  format?: string;
  hasAlpha?: boolean;
}

// Upload analytics
export interface UploadAnalytics {
  totalUploads: number;
  totalSize: number;
  averageUploadTime: number;
  successRate: number;
  mostUploadedFormats: string[];
  storageUsage: {
    audio: number;
    images: number;
    total: number;
  };
}

// Upload settings
export interface UploadSettings {
  autoCompressImages: boolean;
  generateWaveforms: boolean;
  createThumbnails: boolean;
  maxConcurrentUploads: number;
  enableResumableUploads: boolean;
  defaultPrivacy: 'public' | 'followers' | 'private';
} 