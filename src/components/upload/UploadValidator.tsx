import React, { useState, useEffect, useRef } from 'react';
import { useUploadValidation } from '../../hooks/useUploadValidation';
import { TierBasedLimits } from './TierBasedLimits';
import { ValidationModal } from './ValidationModal';
import { 
  Upload,
  CheckCircle
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
  const [hasValidated, setHasValidated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const validationKeyRef = useRef<string>('');

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

  // Auto-validate when file and metadata are available (only once per file/metadata combination)
  useEffect(() => {
    if (file && metadata.title && metadata.genre) {
      // Create a unique key for this validation
      const validationKey = `${file.name}-${file.size}-${metadata.title}-${metadata.genre}`;
      
      // Only validate if we haven't validated this exact combination before
      if (validationKeyRef.current !== validationKey) {
        console.log('🔄 Starting validation for new file/metadata combination');
        validationKeyRef.current = validationKey;
        setHasValidated(false);
        
        // Show modal and start validation
        setShowModal(true);
        
        // Add a small delay to prevent rapid validation calls
        const timeoutId = setTimeout(() => {
          validateFile(file, metadata).then((result) => {
            if (result) {
              setHasValidated(true);
              onValidationComplete(result.result);
              setShowUpgradePrompt(result.upgradePrompt?.show || false);
            } else if (error) {
              onValidationError(error);
            }
          });
        }, 500); // 500ms delay

        return () => clearTimeout(timeoutId);
      }
    }
  }, [file?.name, file?.size, metadata?.title, metadata?.genre]); // Only depend on the actual values, not functions

  // Handle upgrade prompt
  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    clearValidation();
    setShowUpgradePrompt(false);
    setHasValidated(false);
    validationKeyRef.current = '';
  };

  // Handle retry validation
  const handleRetry = () => {
    clearValidation();
    setHasValidated(false);
    validationKeyRef.current = '';
    // Trigger re-validation by changing the validation key
    if (file && metadata.title && metadata.genre) {
      const newKey = `${file.name}-${file.size}-${metadata.title}-${metadata.genre}-${Date.now()}`;
      validationKeyRef.current = newKey;
      validateFile(file, metadata).then((result) => {
        if (result) {
          setHasValidated(true);
          onValidationComplete(result.result);
          setShowUpgradePrompt(result.upgradePrompt?.show || false);
        } else if (error) {
          onValidationError(error);
        }
      });
    }
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
    <>
      <div className={`upload-validator ${className}`}>
        {/* Show tier limits when no file is selected */}
        {!file && tierLimits && (
          <div className="mt-6">
            <TierBasedLimits 
              tier={tierLimits.tier} 
              limits={tierLimits.limits}
              className="max-w-md mx-auto"
            />
          </div>
        )}

        {/* Show validation status when completed */}
        {hasValidated && validationResult?.isValid && !isValidating && (
          <div className="mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-green-700 dark:text-green-300 font-medium text-sm">
                  ✅ File validated successfully - ready for upload!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Modal */}
      <ValidationModal
        isOpen={showModal}
        isValidating={isValidating}
        progress={progress}
        validationResult={validationResult}
        error={error}
        fileName={file?.name}
        onClose={handleCloseModal}
        onRetry={handleRetry}
        upgradePrompt={showUpgradePrompt ? {
          show: true,
          reason: 'Your file exceeds the free tier limits',
          benefits: [
            'Upload files up to 200MB (Pro) or 500MB (Enterprise)',
            'Priority processing and advanced features',
            'HD audio quality and instant processing'
          ],
          cta: 'Upgrade Now'
        } : undefined}
      />
    </>
  );
}

