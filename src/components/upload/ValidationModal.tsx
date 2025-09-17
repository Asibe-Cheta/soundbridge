import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  X,
  Loader2,
  FileAudio,
  Zap
} from 'lucide-react';
import type { 
  UploadValidationResult,
  UploadProgress,
  UploadValidationError,
  UploadValidationWarning
} from '../../lib/types/upload-validation';

interface ValidationModalProps {
  isOpen: boolean;
  isValidating: boolean;
  progress: UploadProgress | null;
  validationResult: UploadValidationResult | null;
  error: string | null;
  fileName?: string;
  onClose: () => void;
  onRetry?: () => void;
  upgradePrompt?: {
    show: boolean;
    reason: string;
    benefits: string[];
    cta: string;
  };
}

export function ValidationModal({
  isOpen,
  isValidating,
  progress,
  validationResult,
  error,
  fileName,
  onClose,
  onRetry,
  upgradePrompt
}: ValidationModalProps) {
  
  // Auto-close modal on successful validation
  useEffect(() => {
    if (validationResult?.isValid && !isValidating) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Auto-close after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [validationResult?.isValid, isValidating, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Render modal using portal to ensure it's at the document root level
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
            {isValidating ? (
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            ) : validationResult?.isValid ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : error ? (
              <AlertCircle className="h-6 w-6 text-red-500" />
            ) : (
              <FileAudio className="h-6 w-6 text-gray-500" />
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isValidating ? (progress?.message || 'Analyzing Audio') : 
               validationResult?.isValid ? 'Validation Complete' :
               error ? 'Validation Error' : 'File Validation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* File Info */}
          {fileName && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileAudio className="h-4 w-4" />
                <span className="font-medium">{fileName}</span>
              </div>
            </div>
          )}

          {/* Validation Progress */}
          {isValidating && progress && (
            <div className="mb-6">
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progress.message}
                </p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Progress</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {validationResult?.isValid && !isValidating && (
            <div className="text-center">
              <div className="mb-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                  File Ready for Upload!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Your file meets all requirements and can be uploaded successfully.
                </p>
              </div>
              
              {/* File Details */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    File Size
                  </span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {(validationResult.appliedRules.fileSize.actual / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                {validationResult.metadata?.duration && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Duration
                    </span>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      {Math.floor(validationResult.metadata.duration / 60)}:{(validationResult.metadata.duration % 60).toFixed(0).padStart(2, '0')}
                    </span>
                  </div>
                )}
                {validationResult.metadata?.bitrate && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Quality
                    </span>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      {validationResult.metadata.bitrate} kbps {validationResult.metadata.format}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Tier
                  </span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {validationResult.tier.toUpperCase()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                This modal will close automatically in 2 seconds...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isValidating && (
            <div className="text-center">
              <div className="mb-4">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                  Validation Failed
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                  {error}
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationResult && !validationResult.isValid && validationResult.errors.length > 0 && !isValidating && (
            <div className="mb-4">
              <div className="mb-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2 text-center">
                  Issues Found
                </h3>
              </div>
              
              <div className="space-y-3 mb-6">
                {validationResult.errors.map((error, index) => (
                  <ValidationErrorItem key={index} error={error} />
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Upgrade Prompt */}
          {upgradePrompt?.show && (
            <div className="mt-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-6 w-6 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                      Upgrade for Better Limits
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                      {upgradePrompt.reason}
                    </p>
                    <div className="space-y-2 mb-3">
                      {upgradePrompt.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          <span className="text-xs text-purple-700 dark:text-purple-300">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => window.location.href = '/pricing'}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      {upgradePrompt.cta}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Validation Error Item Component
function ValidationErrorItem({ error }: { error: UploadValidationError }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {error.message}
          </p>
          {error.suggestion && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              💡 {error.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document root
  return createPortal(modalContent, document.body);
}
