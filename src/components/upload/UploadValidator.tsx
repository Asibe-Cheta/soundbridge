import React, { useState, useEffect } from 'react';
import { useUploadValidation } from '../../hooks/useUploadValidation';
import { ValidationProgress } from './ValidationProgress';
import { TierBasedLimits } from './TierBasedLimits';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Upload, 
  X,
  ArrowRight,
  Crown,
  Zap
} from 'lucide-react';
import type { 
  UploadValidationRequest,
  UploadValidationResult,
  UploadValidationError,
  UploadValidationWarning
} from '../../lib/types/upload-validation';

interface UploadValidatorProps {
  file: File | null;
  metadata: UploadValidationRequest['metadata'];
  onValidationComplete: (result: UploadValidationResult) => void;
  onValidationError: (error: string) => void;
  className?: string;
}

export function UploadValidator({
  file,
  metadata,
  onValidationComplete,
  onValidationError,
  className = ''
}: UploadValidatorProps) {
  const {
    isValidating,
    validationResult,
    progress,
    error,
    validateFile,
    clearValidation,
    getTierLimits
  } = useUploadValidation();

  const [tierLimits, setTierLimits] = useState<any>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Load tier limits on component mount
  useEffect(() => {
    const loadTierLimits = async () => {
      const limits = await getTierLimits();
      if (limits) {
        setTierLimits(limits);
      }
    };
    loadTierLimits();
  }, [getTierLimits]);

  // Auto-validate when file and metadata are available
  useEffect(() => {
    if (file && metadata.title && metadata.genre) {
      // Add a small delay to prevent rapid validation calls
      const timeoutId = setTimeout(() => {
        validateFile(file, metadata).then((result) => {
          if (result) {
            onValidationComplete(result.result);
            setShowUpgradePrompt(result.upgradePrompt?.show || false);
          } else if (error) {
            onValidationError(error);
          }
        });
      }, 500); // 500ms delay

      return () => clearTimeout(timeoutId);
    }
  }, [file, metadata.title, metadata.genre, validateFile, onValidationComplete, onValidationError, error]);

  // Handle upgrade prompt
  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  // Handle cancel validation
  const handleCancel = () => {
    clearValidation();
    setShowUpgradePrompt(false);
  };

  if (!file) {
    return (
      <div className={`upload-validator ${className}`}>
        <div className="validator-placeholder">
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Select a file to validate
          </h3>
          <p className="text-sm text-gray-500">
            Choose an audio file to see upload limits and validation status
          </p>
          
          {tierLimits && (
            <div className="mt-6">
              <TierBasedLimits 
                tier={tierLimits.tier} 
                limits={tierLimits.limits}
                className="max-w-md mx-auto"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`upload-validator ${className}`}>
      {/* Validation Progress */}
      {isValidating && progress && (
        <div className="mb-6">
          <ValidationProgress 
            progress={progress}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Validation Results */}
      {validationResult && !isValidating && (
        <div className="validation-results mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {validationResult.isValid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Validation Complete
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Validation Failed
                </>
              )}
            </h3>
            
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* File Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {validationResult.tier.toUpperCase()} Tier
                </p>
                <p className="text-xs text-gray-500">
                  {validationResult.appliedRules.fileSize.actual / (1024 * 1024)} / {validationResult.appliedRules.fileSize.limit / (1024 * 1024)} MB
                </p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="errors mb-4">
              <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                Issues Found ({validationResult.errors.length})
              </h4>
              <div className="space-y-2">
                {validationResult.errors.map((error, index) => (
                  <ValidationMessage
                    key={index}
                    type="error"
                    error={error}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="warnings mb-4">
              <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                Warnings ({validationResult.warnings.length})
              </h4>
              <div className="space-y-2">
                {validationResult.warnings.map((warning, index) => (
                  <ValidationMessage
                    key={index}
                    type="warning"
                    warning={warning}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {validationResult.isValid && (
            <div className="success mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    File is ready for upload!
                  </p>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Your file meets all requirements and can be uploaded successfully.
                </p>
              </div>
            </div>
          )}

          {/* Upgrade Prompt */}
          {showUpgradePrompt && (
            <div className="upgrade-prompt mb-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Crown className="h-6 w-6 text-purple-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                      Upgrade for Better Limits
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                      Your file exceeds the free tier limits. Upgrade to Pro or Enterprise for larger uploads and priority processing.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUpgrade}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Upgrade Now
                      </button>
                      <button
                        onClick={() => setShowUpgradePrompt(false)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm transition-colors"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !isValidating && (
        <div className="error-state mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="font-medium text-red-700 dark:text-red-300">
                Validation Error
              </p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              {error}
            </p>
            <button
              onClick={handleCancel}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Validation Message Component
interface ValidationMessageProps {
  type: 'error' | 'warning';
  error?: UploadValidationError;
  warning?: UploadValidationWarning;
}

function ValidationMessage({ type, error, warning }: ValidationMessageProps) {
  const message = error || warning;
  const Icon = type === 'error' ? AlertCircle : AlertTriangle;
  const colorClass = type === 'error' 
    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';

  return (
    <div className={`border rounded-lg p-3 ${colorClass}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {message?.message}
          </p>
          {message?.suggestion && (
            <p className="text-xs mt-1 opacity-75">
              💡 {message.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
