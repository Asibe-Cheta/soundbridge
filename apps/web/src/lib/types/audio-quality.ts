// Audio Quality Types and Constants for SoundBridge

export type AudioQualityLevel = 'standard' | 'hd' | 'lossless';
export type AudioQualityTier = 'free' | 'pro' | 'enterprise';

export interface AudioQualitySettings {
  level: AudioQualityLevel;
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  channels: number; // 1 = mono, 2 = stereo
  codec: string;
  format: string;
  description: string;
  tier: AudioQualityTier;
}

export interface AudioProcessingOptions {
  inputFile: File;
  targetQuality: AudioQualitySettings;
  onProgress?: (progress: number) => void;
}

export interface AudioProcessingResult {
  success: boolean;
  processedFile?: File;
  originalMetadata?: {
    bitrate: number;
    sampleRate: number;
    channels: number;
    duration: number;
  };
  processedMetadata?: {
    bitrate: number;
    sampleRate: number;
    channels: number;
    duration: number;
  };
  processingTime: number;
  error?: string;
}

// Quality presets for each tier
export const AUDIO_QUALITY_PRESETS: Record<AudioQualityTier, AudioQualitySettings[]> = {
  free: [
    {
      level: 'standard',
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      codec: 'mp3',
      format: 'audio/mpeg',
      description: 'Standard Quality (128 kbps)',
      tier: 'free'
    }
  ],
  pro: [
    {
      level: 'standard',
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      codec: 'mp3',
      format: 'audio/mpeg',
      description: 'Standard Quality (128 kbps)',
      tier: 'pro'
    },
    {
      level: 'hd',
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      codec: 'mp3',
      format: 'audio/mpeg',
      description: 'HD Quality (320 kbps)',
      tier: 'pro'
    }
  ],
  enterprise: [
    {
      level: 'standard',
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      codec: 'mp3',
      format: 'audio/mpeg',
      description: 'Standard Quality (128 kbps)',
      tier: 'enterprise'
    },
    {
      level: 'hd',
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      codec: 'mp3',
      format: 'audio/mpeg',
      description: 'HD Quality (320 kbps)',
      tier: 'enterprise'
    },
    {
      level: 'lossless',
      bitrate: 1411, // CD quality
      sampleRate: 44100,
      channels: 2,
      codec: 'flac',
      format: 'audio/flac',
      description: 'Lossless Quality (FLAC)',
      tier: 'enterprise'
    }
  ]
};

// Default quality for each tier
export const DEFAULT_QUALITY: Record<AudioQualityTier, AudioQualitySettings> = {
  free: AUDIO_QUALITY_PRESETS.free[0],
  pro: AUDIO_QUALITY_PRESETS.pro[1], // Default to HD for Pro
  enterprise: AUDIO_QUALITY_PRESETS.enterprise[2] // Default to lossless for Enterprise
};

// Quality validation limits
export const QUALITY_VALIDATION_LIMITS = {
  free: {
    maxBitrate: 128,
    allowedLevels: ['standard'] as AudioQualityLevel[]
  },
  pro: {
    maxBitrate: 320,
    allowedLevels: ['standard', 'hd'] as AudioQualityLevel[]
  },
  enterprise: {
    maxBitrate: 1411,
    allowedLevels: ['standard', 'hd', 'lossless'] as AudioQualityLevel[]
  }
};

// Helper functions
export function getQualityPresetsForTier(tier: AudioQualityTier): AudioQualitySettings[] {
  return AUDIO_QUALITY_PRESETS[tier];
}

export function getDefaultQualityForTier(tier: AudioQualityTier): AudioQualitySettings {
  return DEFAULT_QUALITY[tier];
}

export function isQualityAllowedForTier(quality: AudioQualityLevel, tier: AudioQualityTier): boolean {
  return QUALITY_VALIDATION_LIMITS[tier].allowedLevels.includes(quality);
}

export function getQualityDescription(quality: AudioQualityLevel, bitrate?: number): string {
  switch (quality) {
    case 'standard':
      return `Standard Quality${bitrate ? ` (${bitrate} kbps)` : ''}`;
    case 'hd':
      return `HD Quality${bitrate ? ` (${bitrate} kbps)` : ''}`;
    case 'lossless':
      return `Lossless Quality${bitrate ? ` (${bitrate} kbps)` : ''}`;
    default:
      return 'Unknown Quality';
  }
}

export function estimateFileSize(durationSeconds: number, quality: AudioQualitySettings): number {
  // Rough estimation: bitrate (kbps) * duration (seconds) / 8 = bytes
  const bytesPerSecond = (quality.bitrate * 1000) / 8;
  return Math.round(bytesPerSecond * durationSeconds);
}
