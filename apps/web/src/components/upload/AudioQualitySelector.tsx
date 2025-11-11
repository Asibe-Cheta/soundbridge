// Audio Quality Selector Component for SoundBridge
// Allows users to select audio quality during upload

import React, { useState, useEffect } from 'react';
import { 
  getQualityPresetsForTier, 
  getDefaultQualityForTier,
  type AudioQualitySettings,
  type AudioQualityTier,
  estimateFileSize
} from '@/src/lib/types/audio-quality';
import { audioProcessingService } from '@/src/lib/audio-processing-service';
import { Music, Volume2, Zap, Crown, Info, Check, AlertTriangle } from 'lucide-react';

interface AudioQualitySelectorProps {
  userTier: AudioQualityTier;
  selectedQuality: AudioQualitySettings;
  onQualityChange: (quality: AudioQualitySettings) => void;
  audioFile?: File;
  duration?: number;
  className?: string;
}

export function AudioQualitySelector({
  userTier,
  selectedQuality,
  onQualityChange,
  audioFile,
  duration,
  className = ''
}: AudioQualitySelectorProps) {
  const [availableQualities, setAvailableQualities] = useState<AudioQualitySettings[]>([]);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isValid: true, errors: [], warnings: [] });

  useEffect(() => {
    // Get available qualities for user's tier
    const qualities = getQualityPresetsForTier(userTier);
    setAvailableQualities(qualities);
    
    // Set default quality if none selected
    if (!selectedQuality || !qualities.some(q => q.level === selectedQuality.level)) {
      const defaultQuality = getDefaultQualityForTier(userTier);
      onQualityChange(defaultQuality);
    }
  }, [userTier, selectedQuality, onQualityChange]);

  useEffect(() => {
    // Validate selected quality
    if (selectedQuality) {
      const validation = audioProcessingService.validateQualityForTier(selectedQuality, userTier);
      setValidationResult(validation);
    }
  }, [selectedQuality, userTier]);

  const handleQualitySelect = (quality: AudioQualitySettings) => {
    onQualityChange(quality);
  };

  const getQualityIcon = (level: string) => {
    switch (level) {
      case 'standard':
        return <Music className="w-4 h-4" />;
      case 'hd':
        return <Volume2 className="w-4 h-4" />;
      case 'lossless':
        return <Crown className="w-4 h-4" />;
      default:
        return <Music className="w-4 h-4" />;
    }
  };

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'standard':
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100';
      case 'hd':
        return 'border-blue-300 bg-blue-50 hover:bg-blue-100';
      case 'lossless':
        return 'border-purple-300 bg-purple-50 hover:bg-purple-100';
      default:
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getTierBadgeColor = (tier: AudioQualityTier) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const estimatedFileSize = duration && selectedQuality ? estimateFileSize(duration, selectedQuality) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Audio Quality</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(userTier)}`}>
          {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Tier
        </span>
      </div>

      {/* Quality Options */}
      <div className="grid grid-cols-1 gap-3">
        {availableQualities.map((quality) => {
          const isSelected = selectedQuality?.level === quality.level;
          const isRecommended = quality.level === getDefaultQualityForTier(userTier).level;
          
          return (
            <div
              key={quality.level}
              onClick={() => handleQualitySelect(quality)}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-purple-500 bg-purple-50 shadow-md' 
                  : getQualityColor(quality.level)
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {getQualityIcon(quality.level)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{quality.description}</h4>
                      {isRecommended && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">
                        {quality.bitrate} kbps • {quality.sampleRate / 1000} kHz • {quality.channels === 2 ? 'Stereo' : 'Mono'}
                      </p>
                      
                      {estimatedFileSize && (
                        <p className="text-xs text-gray-500">
                          Estimated size: {(estimatedFileSize / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="flex-shrink-0">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Messages */}
      {!validationResult.isValid && validationResult.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Quality Validation Error</h4>
              <ul className="mt-1 text-sm text-red-700">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {validationResult.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Quality Recommendations</h4>
              <ul className="mt-1 text-sm text-yellow-700">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tier Information */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Quality by Tier:</p>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Free:</strong> Standard quality (128 kbps)</li>
              <li>• <strong>Pro:</strong> HD quality (320 kbps)</li>
              <li>• <strong>Enterprise:</strong> Lossless quality (FLAC)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
