import React from 'react';
import { Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { UploadProgress } from '../../lib/types/upload-validation';

interface ValidationProgressProps {
  progress: UploadProgress;
  onCancel?: () => void;
  className?: string;
}

export function ValidationProgress({ 
  progress, 
  onCancel,
  className = '' 
}: ValidationProgressProps) {
  const getStageIcon = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'validation':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'copyright-check':
        return <Loader2 className="h-5 w-5 animate-spin text-purple-500" />;
      case 'moderation':
        return <Loader2 className="h-5 w-5 animate-spin text-orange-500" />;
      case 'upload':
        return <Loader2 className="h-5 w-5 animate-spin text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-gray-500" />;
    }
  };

  const getStageLabel = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'validation':
        return 'Validating File';
      case 'copyright-check':
        return 'Checking Copyright';
      case 'moderation':
        return 'Content Moderation';
      case 'upload':
        return 'Uploading File';
      case 'processing':
        return 'Processing Audio';
      case 'complete':
        return 'Complete';
      default:
        return 'Processing';
    }
  };

  const getProgressColor = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'validation':
        return 'bg-blue-500';
      case 'copyright-check':
        return 'bg-purple-500';
      case 'moderation':
        return 'bg-orange-500';
      case 'upload':
        return 'bg-green-500';
      case 'processing':
        return 'bg-indigo-500';
      case 'complete':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return '';
    
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s remaining`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes}m remaining`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `${hours}h ${minutes}m remaining`;
    }
  };

  return (
    <div className={`validation-progress ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getStageIcon(progress.stage)}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {getStageLabel(progress.stage)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {progress.message}
              </p>
            </div>
          </div>
          
          {progress.canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Cancel validation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.stage)}`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>

        {/* Time Remaining */}
        {progress.estimatedTimeRemaining && (
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Estimated time</span>
            <span>{formatTimeRemaining(progress.estimatedTimeRemaining)}</span>
          </div>
        )}

        {/* Stage Indicators */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                progress.stage === 'validation' || progress.progress > 0 
                  ? 'bg-blue-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span>Validation</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                progress.stage === 'copyright-check' || progress.progress > 20
                  ? 'bg-purple-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span>Copyright</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                progress.stage === 'moderation' || progress.progress > 40
                  ? 'bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span>Moderation</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                progress.stage === 'upload' || progress.progress > 60
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span>Upload</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                progress.stage === 'complete' || progress.progress === 100
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span>Complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
