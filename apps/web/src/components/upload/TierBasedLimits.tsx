import React from 'react';
import { Crown, Zap, Shield, Clock, Upload as UploadIcon, Check, X, ArrowRight } from 'lucide-react';
import type { UploadTierRules } from '../../lib/types/upload-validation';

interface TierBasedLimitsProps {
  tier: 'free' | 'pro';
  limits: UploadTierRules;
  showUpgrade?: boolean;
  className?: string;
}

export function TierBasedLimits({ 
  tier, 
  limits, 
  showUpgrade = true,
  className = '' 
}: TierBasedLimitsProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
    } else {
      return `${(bytes / 1024).toFixed(0)}KB`;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'text-gray-600 dark:text-gray-400';
      case 'pro':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return <UploadIcon className="h-5 w-5" />;
      case 'pro':
        return <Zap className="h-5 w-5" />;
      default:
        return <UploadIcon className="h-5 w-5" />;
    }
  };

  const getProcessingTimeLabel = (processing: string) => {
    switch (processing) {
      case 'standard':
        return '2-5 minutes';
      case 'priority':
        return '1-2 minutes';
      case 'instant':
        return '< 1 minute';
      default:
        return 'Standard';
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'standard':
        return 'Standard Quality';
      case 'hd':
        return 'HD Quality';
      case 'lossless':
        return 'Lossless Quality';
      default:
        return 'Standard Quality';
    }
  };

  const getCopyrightLabel = (copyright: string) => {
    switch (copyright) {
      case 'basic':
        return 'Basic Protection';
      case 'advanced':
        return 'Advanced Protection';
      case 'ai-powered':
        return 'AI-Powered Protection';
      default:
        return 'Basic Protection';
    }
  };

  const getModerationLabel = (moderation: string) => {
    switch (moderation) {
      case 'automated':
        return 'Automated';
      case 'priority':
        return 'Priority Review';
      case 'human-ai':
        return 'Human + AI';
      default:
        return 'Automated';
    }
  };

  const tierFeatures = [
    {
      icon: <UploadIcon className="h-4 w-4" />,
      label: 'File Size Limit',
      value: formatFileSize(limits.fileSize.max),
      description: 'Maximum file size for uploads'
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Processing Speed',
      value: getProcessingTimeLabel(limits.processing),
      description: 'How quickly your upload is processed'
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: 'Copyright Protection',
      value: getCopyrightLabel(limits.copyrightCheck),
      description: 'Level of copyright detection'
    },
    {
      icon: <Check className="h-4 w-4" />,
      label: 'Content Moderation',
      value: getModerationLabel(limits.moderation),
      description: 'Review process for your content'
    },
    {
      icon: <Zap className="h-4 w-4" />,
      label: 'Audio Quality',
      value: getQualityLabel(limits.quality),
      description: 'Quality of audio processing'
    },
    {
      icon: <UploadIcon className="h-4 w-4" />,
      label: 'Concurrent Uploads',
      value: `${limits.concurrentUploads} file${limits.concurrentUploads > 1 ? 's' : ''}`,
      description: 'Number of simultaneous uploads'
    }
  ];

  return (
    <div className={`tier-based-limits ${className}`}>
      {/* Current Tier Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`${getTierColor(tier)}`}>
            {getTierIcon(tier)}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {tier.toUpperCase()} Tier Limits
          </h3>
        </div>
        
        {showUpgrade && tier === 'free' && (
          <button
            onClick={() => window.location.href = '/pricing'}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tierFeatures.map((feature, index) => (
          <div 
            key={index}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-start gap-3">
              <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {feature.label}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {feature.value}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade Benefits for Free Tier */}
      {tier === 'free' && showUpgrade && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Upgrade for Better Limits
                </h4>
                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    <span>Pro: 500MB files, Priority processing, HD quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    <span>Advanced copyright protection and priority moderation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Limits Info */}
      {limits.dailyUploadLimit && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Daily upload limit: {limits.dailyUploadLimit} files
            </p>
          </div>
        </div>
      )}

      {!limits.dailyUploadLimit && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-300">
              Unlimited daily uploads
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
